"""
ASGI config for backend project.

Exposes the ASGI callable as ``application`` (HTTP + WebSocket).
"""

import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

# Django must be set up before importing app code that touches models.
django_asgi_app = get_asgi_application()

from api.middleware import JwtAuthMiddlewareStack  # noqa: E402
from api.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        ),
    }
)
