from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.test import TestCase

from api.models import (
    BookingStatus,
    Court,
    CourtCenter,
    CourtSchedule,
    CourtSlot,
    Sport,
    Transaction,
)
from api.transaction_process.actions import cancel_bookings, reserve_bookings
from api.transaction_process.court_booking import TRANSACTION_STATES
from api.utils.booking_slots import build_available_slots_by_court


class ReserveBookingsLocksSlotIndexTests(TestCase):
    """Pending reservations must hide slots in the CourtSlot search index."""

    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@example.com", "pass")
        self.customer = User.objects.create_user(
            "customer", "customer@example.com", "pass"
        )
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
            price_per_hour="100000",
            price_currency="VND",
        )
        self.slot_date = date.today() + timedelta(days=7)
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=self.slot_date.weekday(),
            start_time=time(8, 0),
            end_time=time(18, 0),
        )
        # Two adjacent hours so merge_adjacent_slots creates a multi-hour booking.
        for start_hour, end_hour in ((10, 11), (11, 12)):
            CourtSlot.objects.create(
                court=self.court,
                date=self.slot_date,
                start_time=time(start_hour, 0),
                end_time=time(end_hour, 0),
                is_available=True,
            )
        self.slots = [
            {"date": self.slot_date, "start": time(10, 0), "end": time(11, 0)},
            {"date": self.slot_date, "start": time(11, 0), "end": time(12, 0)},
        ]
        self.transaction = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.INITIAL,
            pay_in_total_amount="0",
            pay_in_total_currency="VND",
            pay_out_total_amount="0",
            pay_out_total_currency="VND",
        )

    def test_reserve_marks_pending_slots_unavailable(self):
        reserve_bookings(self.transaction, {"slots": self.slots})

        locked = list(
            CourtSlot.objects.filter(court=self.court, date=self.slot_date)
            .order_by("start_time")
            .values_list("start_time", "is_available")
        )
        self.assertEqual(
            locked,
            [
                (time(10, 0), False),
                (time(11, 0), False),
            ],
        )
        self.assertEqual(
            self.transaction.bookings.filter(status=BookingStatus.PENDING).count(),
            1,
        )

        available = build_available_slots_by_court([self.court], self.slot_date)
        self.assertEqual(available[self.court.id], [])

    def test_cancel_releases_slots_locked_on_reserve(self):
        reserve_bookings(self.transaction, {"slots": self.slots})
        cancel_bookings(self.transaction, {})

        released = list(
            CourtSlot.objects.filter(court=self.court, date=self.slot_date)
            .order_by("start_time")
            .values_list("is_available", flat=True)
        )
        self.assertEqual(released, [True, True])
        self.assertTrue(
            self.transaction.bookings.filter(status=BookingStatus.CANCELLED).exists()
        )
