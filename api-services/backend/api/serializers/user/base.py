from django.contrib.auth.models import User
from rest_framework import serializers

from api.models import UserProfile

from ..image import ImageResourceSerializer


class UserProfileReadSerializer(serializers.ModelSerializer):
    avatar = ImageResourceSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ["name", "phone_number", "address", "date_of_birth", "avatar"]


class UserIdSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id"]


class PublicOwnerSerializer(serializers.ModelSerializer):
    """Safe owner fields for public listing search and browse."""

    class Meta:
        model = User
        fields = ["id"]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        try:
            profile = instance.profile
        except UserProfile.DoesNotExist:
            profile = None

        representation["name"] = profile.name if profile else ""
        representation["avatar"] = (
            ImageResourceSerializer(profile.avatar).data
            if profile and profile.avatar
            else None
        )
        return representation
