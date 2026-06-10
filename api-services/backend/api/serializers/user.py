from django.contrib.auth.models import User
from rest_framework import serializers


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
        return user


class OwnerIdSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id"]


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email"]
