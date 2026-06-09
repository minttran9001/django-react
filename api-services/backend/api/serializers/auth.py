from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)

    def validate(self, attrs):
        email = attrs.pop("email")
        try:
            user = User.objects.get(email=email)
            if not user.is_active:
                raise AuthenticationFailed(
                    "Email not verified. Check your inbox.",
                    "email_not_verified",
                )
        except User.DoesNotExist:
            raise AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            )

        attrs[self.username_field] = user.get_username()
        return super().validate(attrs)
