from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from api.models import (
    Booking,
    BookingStatus,
    Court,
    CourtCenter,
    CourtSchedule,
    CourtSlot,
    Sport,
    Transaction,
)
from api.transaction_process.court_booking import TRANSACTION_STATES
from api.utils.court_center_sync import sync_court_schedules


def _next_weekday(day_of_week: int) -> date:
    """Return the next date with the given weekday (0=Mon), not before tomorrow."""
    candidate = date.today() + timedelta(days=1)
    while candidate.weekday() != day_of_week:
        candidate += timedelta(days=1)
    return candidate


class ScheduleSyncActiveBookingGuardTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@test.com", "pass")
        self.customer = User.objects.create_user(
            "customer", "customer@test.com", "pass"
        )
        self.sport = Sport.objects.create(name="Tennis", code="tennis")
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Center",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.court = Court.objects.create(
            center=self.center,
            sport=self.sport,
            title="Court A",
            price_per_hour=Decimal("10.00"),
            price_currency="USD",
        )
        # Monday 09:00–18:00
        self.schedule = CourtSchedule.objects.create(
            court=self.court,
            day_of_week=0,
            start_time=time(9, 0),
            end_time=time(18, 0),
        )
        self.booking_date = _next_weekday(0)
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

    def _confirmed_booking(self, start=time(16, 0), end=time(17, 0)):
        tx = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.CONFIRMED,
            pay_in_total_amount=Decimal("10.00"),
            pay_in_total_currency="USD",
            pay_out_total_amount=Decimal("10.00"),
            pay_out_total_currency="USD",
        )
        return Booking.objects.create(
            transaction=tx,
            court=self.court,
            user=self.customer,
            status=BookingStatus.CONFIRMED,
            date=self.booking_date,
            start_time=start,
            end_time=end,
        )

    def test_shortening_schedule_rejects_when_confirmed_booking_orphaned(self):
        booking = self._confirmed_booking()
        CourtSlot.objects.create(
            court=self.court,
            date=self.booking_date,
            start_time=time(16, 0),
            end_time=time(17, 0),
            is_available=False,
        )

        with self.assertRaises(ValidationError) as ctx:
            sync_court_schedules(
                self.court,
                [
                    {
                        "id": self.schedule.id,
                        "day_of_week": 0,
                        "start_time": time(9, 0),
                        "end_time": time(15, 0),
                    }
                ],
            )

        self.assertIn("schedules", ctx.exception.detail)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.end_time, time(18, 0))
        self.assertTrue(Booking.objects.filter(pk=booking.pk).exists())
        self.assertTrue(
            CourtSlot.objects.filter(
                court=self.court,
                date=self.booking_date,
                start_time=time(16, 0),
            ).exists()
        )

    def test_api_patch_rejects_schedule_shrink_over_active_booking(self):
        self._confirmed_booking()

        response = self.client.patch(
            f"/api/court-centers/mine/{self.center.pk}/schedules",
            {
                "courts": [
                    {
                        "id": self.court.id,
                        "schedules": [
                            {
                                "id": self.schedule.id,
                                "day_of_week": 0,
                                "start_time": "09:00:00",
                                "end_time": "15:00:00",
                            }
                        ],
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.end_time, time(18, 0))

    def test_harmless_schedule_shrink_allowed(self):
        self._confirmed_booking(start=time(10, 0), end=time(11, 0))

        sync_court_schedules(
            self.court,
            [
                {
                    "id": self.schedule.id,
                    "day_of_week": 0,
                    "start_time": time(9, 0),
                    "end_time": time(15, 0),
                }
            ],
        )

        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.end_time, time(15, 0))

    def test_cancelled_booking_does_not_block_schedule_change(self):
        Booking.objects.create(
            court=self.court,
            user=self.customer,
            status=BookingStatus.CANCELLED,
            date=self.booking_date,
            start_time=time(16, 0),
            end_time=time(17, 0),
        )

        sync_court_schedules(
            self.court,
            [
                {
                    "id": self.schedule.id,
                    "day_of_week": 0,
                    "start_time": time(9, 0),
                    "end_time": time(12, 0),
                }
            ],
        )

        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.end_time, time(12, 0))
