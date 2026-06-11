from django.contrib.auth.models import User
from django.db import models

from .image import Image


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=255, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    avatar = models.ForeignKey(
        Image,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    @classmethod
    def for_user(cls, user: User) -> "UserProfile":
        profile, _ = cls.objects.get_or_create(user=user)
        return profile

    def __str__(self):
        return self.name or self.user.email
