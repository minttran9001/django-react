from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from api.utils.attach_images import resolve_owner_image
from api.utils.email_verification import create_verification_token
from api.utils.emails import send_verification_email


class EditProfileSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    avatar_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)

    def validate_email(self, value):
        user = self.context["request"].user
        if (
            User.objects.filter(email=value).exclude(pk=user.pk).exists()
            or User.objects.filter(username=value).exclude(pk=user.pk).exists()
        ):
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
                user.email = email
                user.username = email
                user.is_active = False
                user.save(update_fields=["email", "username", "is_active"])
                verification = create_verification_token(user)
                send_verification_email(user, verification.token)

        self.email_changed = email_changed
        return profile
