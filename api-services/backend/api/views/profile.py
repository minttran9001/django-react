from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from api.serializers import EditProfileSerializer
from api.models import UserProfile

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        serializer = EditProfileSerializer(
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