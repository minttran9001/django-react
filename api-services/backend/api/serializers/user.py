from datetime import date, datetime

from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from api.models import UserProfile
from api.utils.attach_images import resolve_owner_image
from api.utils.user_account import change_user_email, user_email_taken

from .image import ImageResourceSerializer


class UserProfileReadSerializer(serializers.ModelSerializer):
    avatar = ImageResourceSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ["name", "phone_number", "address", "date_of_birth", "avatar"]


class UserIdSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id"]


class UserReadSerializer(serializers.ModelSerializer):
    """Auth account plus flattened profile fields."""

    class Meta:
        model = User
        fields = ["id", "email"]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        try:
            profile = instance.profile
        except UserProfile.DoesNotExist:
            profile = None

        if profile is not None:
            representation.update(UserProfileReadSerializer(profile).data)
        else:
            representation.update(
                {
                    "name": "",
                    "phone_number": "",
                    "address": "",
                    "date_of_birth": None,
                    "avatar": None,
                }
            )

        return representation


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_email(self, value):
        if user_email_taken(value):
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        validated_data["username"] = validated_data["email"]
        user = User.objects.create_user(**validated_data)
        user.is_active = False
        user.save(update_fields=["is_active"])
        UserProfile.for_user(user)
        return user


class ApiDateField(serializers.DateField):
    """Accepts YYYY-MM-DD and ISO datetime strings from clients."""

    def to_internal_value(self, value):
        if value in (None, ""):
            return None

        if isinstance(value, str) and "T" in value:
            normalized = value.replace("Z", "+00:00")
            try:
                value = datetime.fromisoformat(normalized).date().isoformat()
            except ValueError as exc:
                raise serializers.ValidationError(
                    "Date has wrong format. Use YYYY-MM-DD."
                ) from exc

        parsed = super().to_internal_value(value)
        return parsed if isinstance(parsed, date) else parsed


class UserProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = ApiDateField(required=False, allow_null=True)
    avatar_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)

    def validate_email(self, value):
        user = self.context["request"].user
        if user_email_taken(value, exclude_user_id=user.pk):
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def update(self, profile, validated_data):
        user = profile.user
        email = validated_data.pop("email", None)
        avatar_id = validated_data.pop("avatar_id", serializers.empty)

        for field in ("name", "phone_number", "address", "date_of_birth"):
            if field in validated_data:
                setattr(profile, field, validated_data[field])

        if avatar_id is not serializers.empty:
            if avatar_id is None:
                profile.avatar = None
            else:
                profile.avatar = resolve_owner_image(user, avatar_id)

        email_changed = email is not None and email != user.email

        with transaction.atomic():
            profile.save()
            if email_changed:
                change_user_email(user, email)

        self.email_changed = email_changed
        return profile
