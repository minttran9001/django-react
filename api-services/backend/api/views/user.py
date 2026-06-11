from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import UserProfile
from api.utils import create_verification_token, send_verification_email

from ..serializers import (
    RegisterSerializer,
    UserProfileUpdateSerializer,
    UserReadSerializer,
)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        verification = create_verification_token(user)
        send_verification_email(user, verification.token)

        return Response(
            {
                "user": UserReadSerializer(user).data,
                "message": "Verification email sent.",
            },
            status=status.HTTP_201_CREATED,
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = (
            User.objects.select_related("profile", "profile__avatar")
            .get(pk=request.user.pk)
        )
        return Response({"user": UserReadSerializer(user).data})


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        profile = UserProfile.for_user(request.user)

        serializer = UserProfileUpdateSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if getattr(serializer, "email_changed", False):
            return Response(
                {
                    "message": "Profile updated. Please verify your new email address.",
                    "email_verification_required": True,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"message": "Profile updated successfully."},
            status=status.HTTP_200_OK,
        )
