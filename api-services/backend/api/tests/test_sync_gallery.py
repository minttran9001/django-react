from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models import CourtCenter, Image
from api.utils.attach_images import sync_gallery


class SyncGalleryTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", password="x")
        self.center = CourtCenter.objects.create(owner=self.owner, title="Center")
        self.content_type = ContentType.objects.get_for_model(CourtCenter)
        self.gallery = [
            Image.objects.create(
                owner=self.owner,
                url=f"https://example.com/{i}.jpg",
                kind=Image.Kind.GALLERY,
                content_type=self.content_type,
                object_id=self.center.id,
                sort_order=i,
            )
            for i in range(3)
        ]

    def _gallery_ids(self):
        return list(
            Image.objects.filter(
                content_type=self.content_type,
                object_id=self.center.id,
                kind=Image.Kind.GALLERY,
            )
            .order_by("sort_order", "id")
            .values_list("id", flat=True)
        )

    def test_invalid_image_id_does_not_delete_existing_gallery(self):
        keep_id = self.gallery[0].id
        before = self._gallery_ids()

        with self.assertRaises(ValidationError):
            sync_gallery(
                self.content_type,
                self.center.id,
                self.owner,
                [keep_id, 999_999],
            )

        self.assertEqual(self._gallery_ids(), before)
        self.assertTrue(
            Image.objects.filter(id__in=[g.id for g in self.gallery]).count() == 3
        )

    def test_valid_sync_replaces_gallery(self):
        keep = self.gallery[0]
        pending = Image.objects.create(
            owner=self.owner,
            url="https://example.com/new.jpg",
        )

        sync_gallery(
            self.content_type,
            self.center.id,
            self.owner,
            [keep.id, pending.id],
        )

        self.assertEqual(self._gallery_ids(), [keep.id, pending.id])
        pending.refresh_from_db()
        self.assertEqual(pending.kind, Image.Kind.GALLERY)
        self.assertEqual(pending.object_id, self.center.id)
        self.assertFalse(
            Image.objects.filter(
                id__in=[self.gallery[1].id, self.gallery[2].id]
            ).exists()
        )
