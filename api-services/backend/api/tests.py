from datetime import date, datetime, time
from decimal import Decimal
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models import Court, CourtCenter, CourtSchedule, Sport
from api.utils.app_timezone import DEFAULT_TIMEZONE
from api.utils.booking_slots import (
    is_slot_start_in_past,
    validate_slots_are_available_for_court,
)


class PastSlotTimezoneBypassTests(TestCase):
    """Client ?timezone= must not reopen wall-clock slots already past in UTC."""

    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@example.com", "pass")
        self.sport = Sport.objects.create(name="Tennis", code="tennis")
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="UTC Courts",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.court = Court.objects.create(
            sport=self.sport,
            center=self.center,
            title="Court 1",
            price_per_hour=Decimal("100000"),
            price_currency="VND",
        )
        # Cover every weekday so the date under test always fits the schedule.
        for day in range(7):
            CourtSchedule.objects.create(
                court=self.court,
                day_of_week=day,
                start_time=time(8, 0),
                end_time=time(22, 0),
            )

    def test_western_timezone_cannot_revive_utc_past_slot(self):
        # 2026-09-28 15:00 UTC → 05:00 in Pacific/Honolulu.
        # Slot 10:00–11:00 is still "future" in Honolulu but already over in UTC.
        frozen_now = datetime(2026, 9, 28, 15, 0, tzinfo=ZoneInfo("UTC"))
        slot = {
            "date": date(2026, 9, 28),
            "start": time(10, 0),
            "end": time(11, 0),
        }
        hawaii = ZoneInfo("Pacific/Honolulu")

        with patch("api.utils.app_timezone.timezone.now", return_value=frozen_now):
            self.assertFalse(
                is_slot_start_in_past(slot["date"], slot["start"], hawaii),
                "precondition: Hawaii clock alone would treat the slot as future",
            )
            self.assertTrue(
                is_slot_start_in_past(slot["date"], slot["start"], DEFAULT_TIMEZONE),
                "precondition: same wall-clock is past in UTC",
            )
            with self.assertRaises(ValidationError) as ctx:
                validate_slots_are_available_for_court([slot], self.court, hawaii)

        self.assertIn("past", str(ctx.exception.detail).lower())

    def test_future_utc_slot_still_accepted(self):
        frozen_now = datetime(2026, 9, 28, 9, 0, tzinfo=ZoneInfo("UTC"))
        slot = {
            "date": date(2026, 9, 28),
            "start": time(10, 0),
            "end": time(11, 0),
        }

        with patch("api.utils.app_timezone.timezone.now", return_value=frozen_now):
            validate_slots_are_available_for_court(
                [slot],
                self.court,
                ZoneInfo("Pacific/Honolulu"),
            )

    def test_slot_starting_now_in_utc_is_rejected(self):
        frozen_now = datetime(2026, 9, 28, 10, 0, tzinfo=ZoneInfo("UTC"))
        slot = {
            "date": date(2026, 9, 28),
            "start": time(10, 0),
            "end": time(11, 0),
        }

        with patch("api.utils.app_timezone.timezone.now", return_value=frozen_now):
            with self.assertRaises(ValidationError):
                validate_slots_are_available_for_court(
                    [slot],
                    self.court,
                    ZoneInfo("Asia/Tokyo"),
                )
