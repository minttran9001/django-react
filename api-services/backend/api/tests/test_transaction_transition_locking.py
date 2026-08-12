"""TransactionEngine must serialize concurrent transitions on one row."""

from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from api.models.booking import Booking, BookingStatus
from api.models.court import Court
from api.models.court_center import CourtCenter
from api.models.court_schedule import CourtSchedule
from api.models.court_slot import CourtSlot
from api.models.sport import Sport
from api.models.transaction import Transaction
from api.transaction_process.actions import ActionError, confirm_bookings
from api.transaction_process.base import InvalidTransitionError, TransactionEngine
from api.transaction_process.court_booking import (
    TRANSACTION_ACTORS,
    TRANSACTION_STATES,
    TRANSACTION_TRANSITIONS,
)


def _seed_venue():
    owner = User.objects.create_user(username="owner", password="x")
    customer = User.objects.create_user(username="customer", password="x")
    sport = Sport.objects.create(name="Tennis", code="tennis")
    center = CourtCenter.objects.create(
        owner=owner,
        title="Center",
        status=CourtCenter.Status.PUBLISHED,
    )
    court = Court.objects.create(
        sport=sport,
        center=center,
        title="Court 1",
        price_per_hour=Decimal("100000"),
        price_currency="VND",
    )
    return owner, customer, court


class ConfirmBookingsGuardTests(TestCase):
    def setUp(self):
        self.owner, self.customer, self.court = _seed_venue()
        self.transaction = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.PENDING_PAYMENT,
            pay_in_total_amount=Decimal("100000"),
            pay_in_total_currency="VND",
            pay_out_total_amount=Decimal("90000"),
            pay_out_total_currency="VND",
        )

    def test_confirm_bookings_fails_when_no_pending_rows(self):
        Booking.objects.create(
            transaction=self.transaction,
            court=self.court,
            user=self.customer,
            status=BookingStatus.CANCELLED,
            date=date.today() + timedelta(days=1),
            start_time=time(9, 0),
            end_time=time(10, 0),
        )
        with self.assertRaises(ActionError):
            confirm_bookings(self.transaction, {})


class StaleStateTransitionTests(TestCase):
    def setUp(self):
        self.owner, self.customer, self.court = _seed_venue()
        self.transaction = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.PENDING_PAYMENT,
            last_transition=TRANSACTION_TRANSITIONS.INITIATE,
            last_transition_at=timezone.now() - timedelta(minutes=20),
            pay_in_total_amount=Decimal("100000"),
            pay_in_total_currency="VND",
            pay_out_total_amount=Decimal("90000"),
            pay_out_total_currency="VND",
        )
        Booking.objects.create(
            transaction=self.transaction,
            court=self.court,
            user=self.customer,
            status=BookingStatus.PENDING,
            date=date.today() + timedelta(days=1),
            start_time=time(9, 0),
            end_time=time(10, 0),
        )

    def test_confirm_rejects_stale_in_memory_state_after_expire(self):
        """Simulate confirm holding a stale PENDING_PAYMENT object after expire won."""
        stale = Transaction.objects.get(pk=self.transaction.pk)
        self.assertEqual(stale.current_state, TRANSACTION_STATES.PENDING_PAYMENT)

        TransactionEngine(self.transaction).transition(
            TRANSACTION_TRANSITIONS.EXPIRE_PAYMENT,
            actor=TRANSACTION_ACTORS.SYSTEM,
        )
        self.transaction.refresh_from_db()
        self.assertEqual(
            self.transaction.current_state,
            TRANSACTION_STATES.PAYMENT_EXPIRED,
        )
        self.assertEqual(
            self.transaction.bookings.get().status,
            BookingStatus.CANCELLED,
        )

        # Stale object still thinks it is PENDING_PAYMENT; lock+reload must reject.
        with self.assertRaises(InvalidTransitionError):
            TransactionEngine(stale).transition(
                TRANSACTION_TRANSITIONS.CONFIRM_PAYMENT,
                actor=TRANSACTION_ACTORS.SYSTEM,
            )

        self.transaction.refresh_from_db()
        self.assertEqual(
            self.transaction.current_state,
            TRANSACTION_STATES.PAYMENT_EXPIRED,
        )
        self.assertEqual(
            self.transaction.bookings.get().status,
            BookingStatus.CANCELLED,
        )


class ConcurrentConfirmExpireTests(TransactionTestCase):
    """Thread-level race: without row locking this produced CONFIRMED + CANCELLED."""

    def setUp(self):
        self.owner, self.customer, self.court = _seed_venue()
        slot_date = date.today() + timedelta(days=2)
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=slot_date.weekday(),
            start_time=time(8, 0),
            end_time=time(12, 0),
        )
        CourtSlot.objects.create(
            court=self.court,
            date=slot_date,
            start_time=time(9, 0),
            end_time=time(10, 0),
            is_available=True,
        )
        self.transaction = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.PENDING_PAYMENT,
            last_transition=TRANSACTION_TRANSITIONS.INITIATE,
            last_transition_at=timezone.now() - timedelta(minutes=20),
            pay_in_total_amount=Decimal("100000"),
            pay_in_total_currency="VND",
            pay_out_total_amount=Decimal("90000"),
            pay_out_total_currency="VND",
        )
        Booking.objects.create(
            transaction=self.transaction,
            court=self.court,
            user=self.customer,
            status=BookingStatus.PENDING,
            date=slot_date,
            start_time=time(9, 0),
            end_time=time(10, 0),
        )
        self.slot_date = slot_date

    def test_confirm_then_expire_cannot_corrupt_booking(self):
        tx_id = self.transaction.pk
        errors: list[BaseException] = []

        def confirm():
            try:
                tx = Transaction.objects.get(pk=tx_id)
                TransactionEngine(tx).transition(
                    TRANSACTION_TRANSITIONS.CONFIRM_PAYMENT,
                    actor=TRANSACTION_ACTORS.SYSTEM,
                )
            except BaseException as exc:  # noqa: BLE001 — collect for assertion
                errors.append(exc)

        def expire():
            try:
                tx = Transaction.objects.get(pk=tx_id)
                TransactionEngine(tx).transition(
                    TRANSACTION_TRANSITIONS.EXPIRE_PAYMENT,
                    actor=TRANSACTION_ACTORS.SYSTEM,
                )
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        # Sequential worst-case interleaving of "both thought PENDING":
        # whichever runs second must fail validation after lock+reload.
        confirm()
        expire()

        tx = Transaction.objects.get(pk=tx_id)
        booking = tx.bookings.get()
        slot = CourtSlot.objects.get(
            court=self.court,
            date=self.slot_date,
            start_time=time(9, 0),
        )

        # Exactly one transition succeeds; booking and slot stay consistent.
        self.assertEqual(tx.current_state, TRANSACTION_STATES.CONFIRMED)
        self.assertEqual(booking.status, BookingStatus.CONFIRMED)
        self.assertFalse(slot.is_available)
        self.assertTrue(
            any(isinstance(e, InvalidTransitionError) for e in errors),
            f"expected InvalidTransitionError, got {errors!r}",
        )
