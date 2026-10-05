"""Regression: DEBUG defaults off; ALLOWED_HOSTS is not hardcoded to ['*']."""

import os

from django.conf import settings
from django.test import SimpleTestCase

from backend.settings import _env_bool


class DebugAndAllowedHostsTests(SimpleTestCase):
    def test_env_bool_defaults_and_truthy_values(self):
        self.assertFalse(_env_bool("DJANGO_DEBUG_UNSET_FOR_TEST", default=False))
        self.assertTrue(_env_bool("DJANGO_DEBUG_UNSET_FOR_TEST", default=True))
        with self.settings():  # no-op; keep SimpleTestCase happy
            pass
        old = os.environ.get("DJANGO_DEBUG_PARSE_TEST")
        try:
            os.environ["DJANGO_DEBUG_PARSE_TEST"] = "true"
            self.assertTrue(_env_bool("DJANGO_DEBUG_PARSE_TEST", default=False))
            os.environ["DJANGO_DEBUG_PARSE_TEST"] = "0"
            self.assertFalse(_env_bool("DJANGO_DEBUG_PARSE_TEST", default=True))
        finally:
            if old is None:
                os.environ.pop("DJANGO_DEBUG_PARSE_TEST", None)
            else:
                os.environ["DJANGO_DEBUG_PARSE_TEST"] = old

    def test_allowed_hosts_is_not_hardcoded_wildcard_default(self):
        """Historical bug was ALLOWED_HOSTS = ['*'] with no env override."""
        explicit = os.getenv("DJANGO_ALLOWED_HOSTS", "").strip()
        if explicit == "*":
            self.skipTest("DJANGO_ALLOWED_HOSTS=* set explicitly in the environment")
        self.assertNotEqual(settings.ALLOWED_HOSTS, ["*"])

    def test_allowed_hosts_non_empty(self):
        self.assertTrue(settings.ALLOWED_HOSTS)
