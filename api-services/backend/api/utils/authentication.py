from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class CookieJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user is not None and not user.is_active:
            raise AuthenticationFailed(
                "Email not verified. Check your inbox.",
                "email_not_verified",
            )
        return user

    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = None

        if header is not None:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            cookie_token = request.COOKIES.get("access_token")
            if cookie_token:
                raw_token = cookie_token.encode("utf-8")

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
