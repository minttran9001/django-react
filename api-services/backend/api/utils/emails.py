from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def send_verification_email(user, token):
    verify_url = (
        f"{settings.FRONTEND_URL}/verify-email"
        f"?email={quote(user.email)}&token={token}"
    )

    text_body = f"Click to verify your email:\n\n{verify_url}\n"
    html_body = (
        f'<p>Click to verify your email:</p>'
        f'<p><a href="{verify_url}">{verify_url}</a></p>'
    )

    email = EmailMultiAlternatives(
        subject="Verify your email",
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)
