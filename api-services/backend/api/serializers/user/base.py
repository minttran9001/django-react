from django.contrib.auth.models import User
from rest_framework import serializers

from api.models import UserProfile
from api.utils.typed_resource import RESOURCE_USER, typed_resource

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


def _owner_profile(instance: User) -> UserProfile | None:
    try:
        return instance.profile
    except UserProfile.DoesNotExist:
        return None


class PublicOwnerSerializer(serializers.ModelSerializer):
    """Public owner. Subclass and set include_avatar to change shape."""

    include_avatar = True
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name"]

    def get_name(self, instance):
        profile = _owner_profile(instance)
        return profile.name if profile else ""

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if self.include_avatar:
            profile = _owner_profile(instance)
            representation["avatar"] = (
                ImageResourceSerializer(profile.avatar).data
                if profile and profile.avatar
                else None
            )
        return typed_resource(RESOURCE_USER, representation)


class PublicOwnerListSerializer(PublicOwnerSerializer):
    include_avatar = False
