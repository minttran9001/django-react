from datetime import date, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models.court import Court
from api.models.court_center import CourtCenter
from api.models.court_schedule import CourtSchedule
from api.models.sport import Sport
from api.utils.booking_slots import (
    expand_slot_to_hourly_specs,
    slot_aligns_to_court_grid,
    validate_slots_are_available_for_court,
)


class SlotGridValidationTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", "o@example.com", "pw")
        self.sport = Sport.objects.create(name="Tennis", code="tennis")
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Center",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.court = Court.objects.create(
            sport=self.sport,
            center=self.center,
            title="Court 1",
            price_per_hour=Decimal("100000"),
            price_currency="VND",
        )
        # Hour-aligned open hours → CourtSlot grid is :00.
        self.tomorrow = date.today() + timedelta(days=1)
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=self.tomorrow.weekday(),
            start_time=time(8, 0),
            end_time=time(18, 0),
        )
        self.tz = ZoneInfo("UTC")

    def test_off_grid_half_hour_start_is_rejected(self):
        """10:30–11:30 fits the schedule but matches no CourtSlot start."""
        self.assertFalse(
            slot_aligns_to_court_grid(
                self.court, self.tomorrow, time(10, 30), time(11, 30)
            )
        )
        with self.assertRaises(ValidationError) as ctx:
            validate_slots_are_available_for_court(
                [{"date": self.tomorrow, "start": time(10, 30), "end": time(11, 30)}],
                self.court,
                self.tz,
            )
        self.assertIn("60-minute", str(ctx.exception.detail))

    def test_partial_hour_duration_is_rejected(self):
        """10:00–10:30 expands to zero hourly specs — confirm would mark nothing."""
        specs = expand_slot_to_hourly_specs(
            {"date": self.tomorrow, "start": time(10, 0), "end": time(10, 30)}
        )
        self.assertEqual(specs, [])
        with self.assertRaises(ValidationError):
            validate_slots_are_available_for_court(
                [{"date": self.tomorrow, "start": time(10, 0), "end": time(10, 30)}],
                self.court,
                self.tz,
            )

    def test_non_hour_end_remainder_is_rejected(self):
        """10:00–11:30 would only mark 10:00 and leave 11:00 CourtSlot free."""
        with self.assertRaises(ValidationError):
            validate_slots_are_available_for_court(
                [{"date": self.tomorrow, "start": time(10, 0), "end": time(11, 30)}],
                self.court,
                self.tz,
            )

    def test_hour_aligned_multi_hour_slot_is_accepted(self):
        validate_slots_are_available_for_court(
            [{"date": self.tomorrow, "start": time(10, 0), "end": time(12, 0)}],
            self.court,
            self.tz,
        )

    def test_half_hour_schedule_grid_allows_aligned_slots(self):
        CourtSchedule.objects.filter(court=self.court).delete()
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=self.tomorrow.weekday(),
            start_time=time(9, 30),
            end_time=time(17, 30),
        )
        validate_slots_are_available_for_court(
            [{"date": self.tomorrow, "start": time(10, 30), "end": time(11, 30)}],
            self.court,
            self.tz,
        )
        with self.assertRaises(ValidationError):
            validate_slots_are_available_for_court(
                [{"date": self.tomorrow, "start": time(10, 0), "end": time(11, 0)}],
                self.court,
                self.tz,
            )
