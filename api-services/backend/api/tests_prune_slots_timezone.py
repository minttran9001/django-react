"""UTC prune must not wipe western-timezone evening inventory still in the future."""

from datetime import date, time, timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase

from api.models import Court, CourtCenter, CourtSlot, Sport
from api.utils.slot_index import prune_past_slots


class PrunePastSlotsTimezoneGraceTests(TestCase):
    def setUp(self):
        owner = User.objects.create_user("owner", "owner@example.com", "pass")
        self.center = CourtCenter.objects.create(
            owner=owner,
            title="UTC Prune Venue",
            status=CourtCenter.Status.PUBLISHED,
        )
        sport = Sport.objects.create(name="Tennis", code="tennis")
        self.court = Court.objects.create(
            center=self.center,
            sport=sport,
            title="Court 1",
            price_per_hour=50,
            price_currency="USD",
        )

    def _slot(self, slot_date: date, start: time, end: time) -> CourtSlot:
        return CourtSlot.objects.create(
            court=self.court,
            date=slot_date,
            start_time=start,
            end_time=end,
            is_available=True,
        )

    def test_default_prune_keeps_yesterday_for_western_evening_grace(self):
        # Cron at 01:00 UTC Tuesday would previously delete Monday slots while
        # America/Los_Angeles is still Monday evening (17:00).
        monday = date(2026, 10, 5)
        tuesday = date(2026, 10, 6)
        sunday = date(2026, 10, 4)

        monday_evening = self._slot(monday, time(18, 0), time(19, 0))
        sunday_slot = self._slot(sunday, time(18, 0), time(19, 0))
        tuesday_slot = self._slot(tuesday, time(10, 0), time(11, 0))

        with patch("api.utils.slot_index.date") as mock_date:
            mock_date.today.return_value = tuesday
            deleted = prune_past_slots()

        self.assertEqual(deleted, 1)
        self.assertFalse(CourtSlot.objects.filter(pk=sunday_slot.pk).exists())
        self.assertTrue(CourtSlot.objects.filter(pk=monday_evening.pk).exists())
        self.assertTrue(CourtSlot.objects.filter(pk=tuesday_slot.pk).exists())

    def test_explicit_before_date_still_honored(self):
        monday = date(2026, 10, 5)
        slot = self._slot(monday, time(18, 0), time(19, 0))
        deleted = prune_past_slots(before_date=monday + timedelta(days=1))
        self.assertEqual(deleted, 1)
        self.assertFalse(CourtSlot.objects.filter(pk=slot.pk).exists())
