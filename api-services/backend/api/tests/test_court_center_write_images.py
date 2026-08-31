from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.test import RequestFactory, TestCase

from api.models import CourtCenter, Image
from api.serializers.court_center.mutations import CourtCenterWriteSerializer


class CourtCenterWriteImageIdsTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="password123",
        )
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Old title",
            description="Old description",
            status=CourtCenter.Status.DRAFT,
        )
        self.content_type = ContentType.objects.get_for_model(CourtCenter)
        self.gallery = Image.objects.create(
            owner=self.owner,
            url="https://example.com/gallery.jpg",
            public_id="gallery-1",
            content_type=self.content_type,
            object_id=self.center.id,
            kind=Image.Kind.GALLERY,
            sort_order=0,
        )
        self.request = RequestFactory().patch("/")
        self.request.user = self.owner

    def test_title_only_patch_does_not_wipe_center_gallery(self):
        serializer = CourtCenterWriteSerializer(
            self.center,
            data={"title": "New title"},
            context={"request": self.request},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.gallery.refresh_from_db()
        self.assertEqual(self.center.gallery.count(), 1)
        self.assertEqual(self.gallery.id, Image.objects.get(pk=self.gallery.pk).id)
        self.center.refresh_from_db()
        self.assertEqual(self.center.title, "New title")

    def test_explicit_empty_image_ids_clears_center_gallery(self):
        serializer = CourtCenterWriteSerializer(
            self.center,
            data={"image_ids": []},
            context={"request": self.request},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertEqual(self.center.gallery.count(), 0)
        self.assertFalse(Image.objects.filter(pk=self.gallery.pk).exists())
