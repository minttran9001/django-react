from datetime import timedelta

from django.conf import settings


ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"


def _cookie_max_age(delta: timedelta) -> int:
    return int(delta.total_seconds())


def set_access_token_cookie(response, access: str) -> None:
    access_lifetime = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
    cookie_kwargs = {
        "httponly": settings.JWT_COOKIE_HTTPONLY,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "path": "/",
    }

    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        access,
        max_age=_cookie_max_age(access_lifetime),
        **cookie_kwargs,
    )


def set_jwt_cookies(response, access: str, refresh: str) -> None:
    access_lifetime = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
    refresh_lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    cookie_kwargs = {
        "httponly": settings.JWT_COOKIE_HTTPONLY,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "path": "/",
    }

    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        access,
        max_age=_cookie_max_age(access_lifetime),
        **cookie_kwargs,
    )
    response.set_cookie(
        REFRESH_TOKEN_COOKIE,
        refresh,
        max_age=_cookie_max_age(refresh_lifetime),
        **cookie_kwargs,
    )


def clear_jwt_cookies(response) -> None:
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path="/")
