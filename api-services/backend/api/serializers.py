from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import Note

# User serializer
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_email(self, value):
        if User.objects.filter(username=value).exists() or User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        validated_data['username'] = validated_data['email']
        user = User.objects.create_user(**validated_data)
        return user

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)

    def validate(self, attrs):
        email = attrs.pop("email")
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            )

        attrs[self.username_field] = user.get_username()
        return super().validate(attrs)

class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email']

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ['id', 'title', 'content', 'author']
        extra_kwargs = {'author': {'read_only': True}}