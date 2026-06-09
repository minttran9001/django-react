from rest_framework import serializers


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    token = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get("email")
        token = attrs.get("token")
        if not email or not token:
            raise serializers.ValidationError("Email and token are required.")
        return attrs


class ResendVerificationEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, attrs):
        email = attrs.get("email")
        if not email:
            raise serializers.ValidationError("Email is required.")
        return attrs
