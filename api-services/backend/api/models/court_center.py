from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericRelation
from django.db import models

from .image import Image


class CourtCenter(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ARCHIVED = "archived", "Archived"
        PUBLISHED = "published", "Published"

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="court_centers")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    images = GenericRelation(Image, related_query_name="court_center")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    @property
    def logo(self):
        return self.images.filter(kind=Image.Kind.LOGO).first()

    @property
    def gallery(self):
        return self.images.filter(kind=Image.Kind.GALLERY)
