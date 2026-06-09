from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..utils import create_verification_token, send_verification_email
from ..models import EmailVerificationToken
from ..serializers import ResendVerificationEmailSerializer, VerifyEmailSerializer


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        token = serializer.validated_data["token"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.is_active:
            return Response({"detail": "User is already verified."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            verification = EmailVerificationToken.objects.get(user=user, token=token)
        except EmailVerificationToken.DoesNotExist:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)

        if verification.expires_at < timezone.now():
            return Response({"detail": "Token expired."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save(update_fields=["is_active"])
        verification.delete()
        return Response({"detail": "Email verified successfully."}, status=status.HTTP_200_OK)


class ResendVerificationEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.get(email=email)
        verification = create_verification_token(user)
        send_verification_email(user, verification.token)
        return Response({"detail": "Verification email sent."}, status=status.HTTP_200_OK)
