from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


def image_upload_to(instance, filename):
    model_name = instance.content_type.model if instance.content_type_id else "unknown"
    return f"images/{model_name}/{instance.object_id}/{filename}"


class Image(models.Model):
    class Kind(models.TextChoices):
        LOGO = "logo", "Logo"
        GALLERY = "gallery", "Gallery"

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveBigIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    file = models.ImageField(upload_to=image_upload_to)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.GALLERY)
    caption = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["content_type", "object_id"],
                condition=models.Q(kind="logo"),
                name="unique_logo_per_object",
            ),
        ]

    def __str__(self):
        return f"{self.content_type} #{self.object_id} — {self.kind} ({self.pk})"
