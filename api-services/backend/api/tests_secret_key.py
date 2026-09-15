"""Regression: Django SECRET_KEY must not be the historically leaked value."""

from django.conf import settings
from django.test import SimpleTestCase

# Value that was previously hardcoded in backend/settings.py (public repo).
_LEAKED_SECRET_KEY = (
    "django-insecure-vc6x$*=h1$s#tkmnyn$_yakek+fe9ea!114&z^5^)%%6_#q0wd"
)


class SecretKeyConfigurationTests(SimpleTestCase):
    def test_secret_key_is_configured(self):
        self.assertTrue(settings.SECRET_KEY)
        self.assertGreaterEqual(len(settings.SECRET_KEY), 16)

    def test_secret_key_is_not_the_public_leaked_value(self):
        self.assertNotEqual(settings.SECRET_KEY, _LEAKED_SECRET_KEY)
