from django.contrib.auth.models import User
from rest_framework import serializers

from api.models import UserProfile

from .image import ImageResourceSerializer


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_email(self, value):
        if User.objects.filter(username=value).exists() or User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        validated_data["username"] = validated_data["email"]
        user = User.objects.create_user(**validated_data)
        user.is_active = False
        user.save(update_fields=["is_active"])
        UserProfile.objects.create(user=user)
        return user


class OwnerIdSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id"]


class OwnerSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    date_of_birth = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "avatar",
            "name",
            "phone_number",
            "address",
            "date_of_birth",
        ]

    def _get_profile(self, obj):
        try:
            return obj.profile
        except UserProfile.DoesNotExist:
            return None

    def get_avatar(self, obj):
        profile = self._get_profile(obj)
        if profile and profile.avatar:
            return ImageResourceSerializer(profile.avatar).data
        return None

    def get_name(self, obj):
        profile = self._get_profile(obj)
        return profile.name if profile else ""

    def get_phone_number(self, obj):
        profile = self._get_profile(obj)
        return profile.phone_number if profile else ""

    def get_address(self, obj):
        profile = self._get_profile(obj)
        return profile.address if profile else ""

    def get_date_of_birth(self, obj):
        profile = self._get_profile(obj)
        return profile.date_of_birth if profile else None


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email"]
