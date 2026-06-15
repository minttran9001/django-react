from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from ..utils.exceptions import error_response
from ..utils import (
    REFRESH_TOKEN_COOKIE,
    clear_jwt_cookies,
    set_access_token_cookie,
    set_jwt_cookies,
)
from ..serializers import EmailTokenObtainPairSerializer, UserReadSerializer


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code != status.HTTP_200_OK:
            return response

        user = User.objects.get(email=request.data["email"])
        set_jwt_cookies(response, response.data["access"], response.data["refresh"])
        response.data = {"user": UserReadSerializer(user).data}
        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh = request.data.get("refresh") or request.COOKIES.get(
            REFRESH_TOKEN_COOKIE
        )
        if not refresh:
            return error_response(
                "Refresh token required.",
                code="refresh_token_required",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data={"refresh": refresh})
        serializer.is_valid(raise_exception=True)

        access = serializer.validated_data["access"]
        response = Response({"access": access}, status=status.HTTP_200_OK)
        set_access_token_cookie(response, access)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"success": True}, status=status.HTTP_200_OK)
        clear_jwt_cookies(response)
        return response
