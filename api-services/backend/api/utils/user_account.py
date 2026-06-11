from django.contrib.auth.models import User
from django.db import models, transaction

from api.models import UserProfile
from api.utils.email_verification import create_verification_token
from api.utils.emails import send_verification_email


def user_email_taken(email: str, *, exclude_user_id: int | None = None) -> bool:
    queryset = User.objects.filter(
        models.Q(email=email) | models.Q(username=email)
    )
    if exclude_user_id is not None:
        queryset = queryset.exclude(pk=exclude_user_id)
    return queryset.exists()


def change_user_email(user: User, new_email: str) -> bool:
    if user.email == new_email:
        return False

    with transaction.atomic():
        user.email = new_email
        user.username = new_email
        user.is_active = False
        user.save(update_fields=["email", "username", "is_active"])
        verification = create_verification_token(user)
        send_verification_email(user, verification.token)

    return True
