from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..utils import create_verification_token, send_verification_email
from ..serializers import CurrentUserSerializer, UserSerializer


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


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = CurrentUserSerializer(request.user)
        return Response({"user": serializer.data})
