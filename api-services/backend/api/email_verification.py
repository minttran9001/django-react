import secrets
from datetime import timedelta
from django.utils import timezone
from .models import EmailVerificationToken

TOKEN_EXPIRY_HOURS = 24


def create_verification_token(user):
    # Delete any existing tokens for the user
    EmailVerificationToken.objects.filter(user=user).delete()
    # Generate a new token
    # Hex avoids = characters that get mangled by email quoted-printable encoding
    token = secrets.token_hex(32)
    # Set the expiration time
    expires_at = timezone.now() + timedelta(hours=TOKEN_EXPIRY_HOURS)

    # Create the new token
    return EmailVerificationToken.objects.create(
        user=user,
        token=token,
        expires_at=expires_at,
    )
