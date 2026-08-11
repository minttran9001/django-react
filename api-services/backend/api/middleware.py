from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken

from api.utils.cookies import ACCESS_TOKEN_COOKIE


@database_sync_to_async
def user_from_token(token: str):
    try:
        access = AccessToken(token)
        return get_user_model().objects.get(id=access["user_id"])
    except Exception:
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        headers = dict(scope.get("headers") or [])
        cookies = {}
        raw = headers.get(b"cookie", b"").decode()
        for part in raw.split(";"):
            if "=" in part:
                k, v = part.strip().split("=", 1)
                cookies[k] = v

        token = cookies.get(ACCESS_TOKEN_COOKIE)
        if not token:
            qs = parse_qs(scope.get("query_string", b"").decode())
            token = (qs.get("token") or [None])[0]

        scope["user"] = (
            await user_from_token(token) if token else AnonymousUser()
        )
        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    return JwtAuthMiddleware(inner)
