from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models import Booking, BookingStatus, Court, CourtCenter, CourtSchedule, Sport
from api.models.transaction import Transaction
from api.transaction_process.court_booking import TRANSACTION_STATES
from api.utils.booking_slots import validate_slots_are_available_for_court


class ConfirmedBookingBlocksSlotTests(TestCase):
    """Paid (CONFIRMED) bookings must block re-booking of the same slot."""

    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@example.com", "pass")
        self.customer_a = User.objects.create_user("customer_a", "a@example.com", "pass")
        self.customer_b = User.objects.create_user("customer_b", "b@example.com", "pass")
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
        self.slot = {
            "date": self.slot_date,
            "start": time(10, 0),
            "end": time(11, 0),
        }

    def _create_booking(self, *, user, status):
        transaction = Transaction.objects.create(
            customer=user,
            provider=self.owner,
            court=self.court,
            current_state=(
                TRANSACTION_STATES.CONFIRMED
                if status == BookingStatus.CONFIRMED
                else TRANSACTION_STATES.PENDING_PAYMENT
            ),
            pay_in_total_amount="100000",
            pay_in_total_currency="VND",
            pay_out_total_amount="90000",
            pay_out_total_currency="VND",
        )
        return Booking.objects.create(
            transaction=transaction,
            court=self.court,
            user=user,
            status=status,
            date=self.slot["date"],
            start_time=self.slot["start"],
            end_time=self.slot["end"],
        )

    def test_confirmed_booking_blocks_new_reservation(self):
        self._create_booking(user=self.customer_a, status=BookingStatus.CONFIRMED)

        with self.assertRaises(ValidationError) as ctx:
            validate_slots_are_available_for_court([self.slot], self.court)

        self.assertIn("already booked", str(ctx.exception.detail))

    def test_pending_booking_still_blocks_new_reservation(self):
        self._create_booking(user=self.customer_a, status=BookingStatus.PENDING)

        with self.assertRaises(ValidationError) as ctx:
            validate_slots_are_available_for_court([self.slot], self.court)

        self.assertIn("already booked", str(ctx.exception.detail))

    def test_cancelled_booking_does_not_block(self):
        self._create_booking(user=self.customer_a, status=BookingStatus.CANCELLED)

        # Should not raise — slot is free again.
        validate_slots_are_available_for_court([self.slot], self.court)
