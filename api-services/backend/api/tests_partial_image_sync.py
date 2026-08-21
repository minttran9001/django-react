from decimal import Decimal

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase

from api.models import Court, CourtCenter, Image, Sport
from api.serializers.court_center.courts import CourtCenterCourtsSerializer
from api.serializers.court_center.mutations import CourtCenterWriteSerializer
from api.utils.attach_images import sync_courts


class PartialImageSyncTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@test.com", "pass")
        self.request = type("R", (), {"user": self.owner})()
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Center",
            status=CourtCenter.Status.DRAFT,
        )
        self.ct = ContentType.objects.get_for_model(CourtCenter)
        self.gallery = Image.objects.create(
            owner=self.owner,
            url="https://example.com/gallery.jpg",
            public_id="gallery",
            content_type=self.ct,
            object_id=self.center.id,
            kind=Image.Kind.GALLERY,
            sort_order=0,
        )
        self.sport = Sport.objects.create(name="Tennis", code="tennis")
        self.court = Court.objects.create(
            center=self.center,
            sport=self.sport,
            title="Court A",
            price_per_hour=Decimal("10.00"),
            price_currency="USD",
        )
        self.court_ct = ContentType.objects.get_for_model(Court)
        self.court_gallery = Image.objects.create(
            owner=self.owner,
            url="https://example.com/court.jpg",
            public_id="court",
            content_type=self.court_ct,
            object_id=self.court.id,
            kind=Image.Kind.GALLERY,
            sort_order=0,
        )

    def test_title_only_patch_does_not_wipe_center_gallery(self):
        serializer = CourtCenterWriteSerializer(
            self.center,
            data={"title": "Renamed Center"},
            context={"request": self.request},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertTrue(Image.objects.filter(pk=self.gallery.pk).exists())
        self.assertEqual(self.center.title, "Renamed Center")

    def test_logo_only_patch_does_not_wipe_center_gallery(self):
        logo = Image.objects.create(
            owner=self.owner,
            url="https://example.com/logo.jpg",
            public_id="logo-pending",
        )
        serializer = CourtCenterWriteSerializer(
            self.center,
            data={"logo_id": logo.id},
            context={"request": self.request},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertTrue(Image.objects.filter(pk=self.gallery.pk).exists())
        logo.refresh_from_db()
        self.assertEqual(logo.kind, Image.Kind.LOGO)
        self.assertEqual(logo.object_id, self.center.id)

    def test_explicit_empty_image_ids_clears_gallery(self):
        serializer = CourtCenterWriteSerializer(
            self.center,
            data={"image_ids": []},
            context={"request": self.request},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertFalse(Image.objects.filter(pk=self.gallery.pk).exists())

    def test_court_update_without_image_ids_preserves_court_gallery(self):
        sync_courts(
            self.center,
            [
                {
                    "id": self.court.id,
                    "sport": self.sport,
                    "title": "Court A Renamed",
                    "description": "",
                    "price_per_hour": self.court.price_per_hour,
                    "price_currency": self.court.price_currency,
                }
            ],
            self.owner,
        )

        self.assertTrue(Image.objects.filter(pk=self.court_gallery.pk).exists())
        self.court.refresh_from_db()
        self.assertEqual(self.court.title, "Court A Renamed")

    def test_courts_serializer_omitting_image_ids_preserves_gallery(self):
        serializer = CourtCenterCourtsSerializer(
            self.center,
            data={
                "courts": [
                    {
                        "id": self.court.id,
                        "sport_id": self.sport.id,
                        "title": "Court A via API",
                        "price_per_hour": {"amount": "12.00", "currency": "USD"},
                    }
                ]
            },
            context={"request": self.request},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertTrue(Image.objects.filter(pk=self.court_gallery.pk).exists())
        self.court.refresh_from_db()
        self.assertEqual(self.court.title, "Court A via API")

    def test_courts_serializer_explicit_empty_image_ids_clears_gallery(self):
        serializer = CourtCenterCourtsSerializer(
            self.center,
            data={
                "courts": [
                    {
                        "id": self.court.id,
                        "sport_id": self.sport.id,
                        "title": "Court A",
                        "image_ids": [],
                        "price_per_hour": {"amount": "10.00", "currency": "USD"},
                    }
                ]
            },
            context={"request": self.request},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertFalse(Image.objects.filter(pk=self.court_gallery.pk).exists())
