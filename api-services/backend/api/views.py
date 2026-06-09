from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .cookies import (
    REFRESH_TOKEN_COOKIE,
    clear_jwt_cookies,
    set_access_token_cookie,
    set_jwt_cookies,
)
from .models import EmailVerificationToken
from .serializers import (
    CurrentUserSerializer,
    EmailTokenObtainPairSerializer,
    UserSerializer,
    VerifyEmailSerializer,
    ResendVerificationEmailSerializer
)

from .email_verification import create_verification_token
from .emails import send_verification_email

from django.utils import timezone




class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        verification = create_verification_token(user)
        send_verification_email(user, verification.token)

        response = Response(
            {
                "user": CurrentUserSerializer(user).data,
                "message": "Verification email sent.",
            },
            status=status.HTTP_201_CREATED,
        )
        
        return response


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code != status.HTTP_200_OK:
            return response

        user = User.objects.get(email=request.data["email"])
        set_jwt_cookies(response, response.data["access"], response.data["refresh"])
        response.data = {"user": CurrentUserSerializer(user).data}
        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh = request.data.get("refresh") or request.COOKIES.get(
            REFRESH_TOKEN_COOKIE
        )
        if not refresh:
            return Response(
                {"detail": "Refresh token required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data={"refresh": refresh})
        serializer.is_valid(raise_exception=True)

        access = serializer.validated_data["access"]
        response = Response({"access": access}, status=status.HTTP_200_OK)
        set_access_token_cookie(response, access)
        return response


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = CurrentUserSerializer(request.user)
        return Response({"user": serializer.data})


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"success": True}, status=status.HTTP_200_OK)
        clear_jwt_cookies(response)
        return response


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
        user.save(update_fields=['is_active'])
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