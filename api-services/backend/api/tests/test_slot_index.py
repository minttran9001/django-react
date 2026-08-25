from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from api.models import (
    Booking,
    BookingStatus,
    Court,
    CourtCenter,
    CourtSlot,
    Sport,
    Transaction,
)
from api.transaction_process.actions import cancel_bookings
from api.transaction_process.court_booking import TRANSACTION_STATES
from api.utils.slot_index import (
    mark_slots_available_from_bookings,
    mark_slots_unavailable,
)


class MarkSlotsAvailableFromBookingsTests(TestCase):
    def setUp(self):
        self.sport = Sport.objects.create(name="Tennis", code="tennis")
        self.owner = User.objects.create_user("owner", "owner@example.com", "pass")
        self.customer_a = User.objects.create_user("a", "a@example.com", "pass")
        self.customer_b = User.objects.create_user("b", "b@example.com", "pass")
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Center",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.court = Court.objects.create(
            sport=self.sport,
            center=self.center,
            title="Court 1",
            price_per_hour=Decimal("100.00"),
            price_currency="USD",
        )
        self.slot_date = date.today() + timedelta(days=3)
        self.slot = CourtSlot.objects.create(
            court=self.court,
            date=self.slot_date,
            start_time=time(10, 0),
            end_time=time(11, 0),
            is_available=True,
        )

    def _make_booking(self, customer, booking_status, tx_state):
        tx = Transaction.objects.create(
            customer=customer,
            provider=self.owner,
            court=self.court,
            current_state=tx_state,
            pay_in_total_amount=Decimal("100.00"),
            pay_in_total_currency="USD",
            pay_out_total_amount=Decimal("90.00"),
            pay_out_total_currency="USD",
        )
        booking = Booking.objects.create(
            transaction=tx,
            court=self.court,
            user=customer,
            status=booking_status,
            date=self.slot_date,
            start_time=time(10, 0),
            end_time=time(11, 0),
        )
        return tx, booking

    def test_cancel_overlapping_pending_keeps_confirmed_slot_unavailable(self):
        """
        Concurrent initiate (or CONFIRMED omission in validation) can leave two
        active bookings on one hour. Expiring the pending hold must not free the
        CourtSlot still held by the confirmed booking.
        """
        _tx_a, _booking_a = self._make_booking(
            self.customer_a,
            BookingStatus.CONFIRMED,
            TRANSACTION_STATES.CONFIRMED,
        )
        mark_slots_unavailable(
            self.court.id,
            [{"date": self.slot_date, "start": time(10, 0)}],
        )
        self.slot.refresh_from_db()
        self.assertFalse(self.slot.is_available)

        tx_b, _booking_b = self._make_booking(
            self.customer_b,
            BookingStatus.PENDING,
            TRANSACTION_STATES.PENDING_PAYMENT,
        )
        cancel_bookings(tx_b, {})

        self.slot.refresh_from_db()
        self.assertFalse(
            self.slot.is_available,
            "Confirmed booking still holds this hour; cancel must not free it",
        )

    def test_cancel_sole_pending_booking_frees_slot(self):
        tx, booking = self._make_booking(
            self.customer_a,
            BookingStatus.PENDING,
            TRANSACTION_STATES.PENDING_PAYMENT,
        )
        mark_slots_unavailable(
            self.court.id,
            [{"date": self.slot_date, "start": time(10, 0)}],
        )
        mark_slots_available_from_bookings(
            self.court.id,
            Booking.objects.filter(pk=booking.pk),
        )
        self.slot.refresh_from_db()
        self.assertTrue(self.slot.is_available)
        # status update is cancel_bookings' job; this unit only covers slot release
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.PENDING)

    def test_cancel_multi_hour_pending_preserves_partial_overlap_with_confirmed(self):
        """Pending 10–12 expires while confirmed holds 11–12 → only 10–11 frees."""
        CourtSlot.objects.create(
            court=self.court,
            date=self.slot_date,
            start_time=time(11, 0),
            end_time=time(12, 0),
            is_available=False,
        )
        self.slot.is_available = False
        self.slot.save(update_fields=["is_available"])

        _tx_a, _booking_a = self._make_booking(
            self.customer_a,
            BookingStatus.CONFIRMED,
            TRANSACTION_STATES.CONFIRMED,
        )
        # Confirmed is single hour 10–11 from helper; recreate as 11–12
        Booking.objects.filter(user=self.customer_a).update(
            start_time=time(11, 0),
            end_time=time(12, 0),
        )

        tx_b = Transaction.objects.create(
            customer=self.customer_b,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.PENDING_PAYMENT,
            pay_in_total_amount=Decimal("200.00"),
            pay_in_total_currency="USD",
            pay_out_total_amount=Decimal("180.00"),
            pay_out_total_currency="USD",
        )
        Booking.objects.create(
            transaction=tx_b,
            court=self.court,
            user=self.customer_b,
            status=BookingStatus.PENDING,
            date=self.slot_date,
            start_time=time(10, 0),
            end_time=time(12, 0),
        )
        cancel_bookings(tx_b, {})

        ten = CourtSlot.objects.get(
            court=self.court, date=self.slot_date, start_time=time(10, 0)
        )
        eleven = CourtSlot.objects.get(
            court=self.court, date=self.slot_date, start_time=time(11, 0)
        )
        self.assertTrue(ten.is_available)
        self.assertFalse(eleven.is_available)
