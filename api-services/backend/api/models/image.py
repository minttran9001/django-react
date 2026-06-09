from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Image(models.Model):
    class Kind(models.TextChoices):
        LOGO = "logo", "Logo"
        GALLERY = "gallery", "Gallery"

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="uploaded_images",
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")

    url = models.URLField(max_length=500)
    public_id = models.CharField(max_length=255, blank=True)
    kind = models.CharField(
        max_length=20,
        choices=Kind.choices,
        null=True,
        blank=True,
    )
    caption = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["owner", "content_type"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["content_type", "object_id"],
                condition=models.Q(kind="logo") & models.Q(content_type__isnull=False),
                name="unique_logo_per_object",
            ),
        ]

    @property
    def is_pending(self) -> bool:
        return self.content_type_id is None

    def __str__(self):
        target = f"{self.content_type} #{self.object_id}" if self.content_type_id else "pending"
        return f"{target} — {self.kind} ({self.pk})"
