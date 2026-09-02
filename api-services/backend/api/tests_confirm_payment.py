from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from api.models import Booking, BookingStatus, Court, CourtCenter, Sport, Transaction
from api.transaction_process.actions import ActionError, capture_payment
from api.transaction_process.base import TransactionEngine
from api.transaction_process.court_booking import (
    TRANSACTION_ACTORS,
    TRANSACTION_STATES,
    TRANSACTION_TRANSITIONS,
)
from api.views.transaction.customer import ConfirmPaymentView


class ConfirmPaymentSecurityTests(TestCase):
    """Customers must not be able to confirm bookings without verified payment."""

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
            price_per_hour=Decimal("100000"),
            price_currency="VND",
        )
        self.transaction = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.PENDING_PAYMENT,
            last_transition=TRANSACTION_TRANSITIONS.INITIATE,
            last_transition_at=timezone.now(),
            pay_in_total_amount=Decimal("100000"),
            pay_in_total_currency="VND",
            pay_out_total_amount=Decimal("90000"),
            pay_out_total_currency="VND",
        )
        tomorrow = date.today() + timedelta(days=1)
        Booking.objects.create(
            transaction=self.transaction,
            court=self.court,
            user=self.customer,
            status=BookingStatus.PENDING,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
        )

    def test_customer_confirm_payment_endpoint_returns_503(self):
        factory = APIRequestFactory()
        request = factory.post(
            f"/api/transactions/{self.transaction.pk}/confirm-payment"
        )
        force_authenticate(request, user=self.customer)
        response = ConfirmPaymentView.as_view()(request, pk=self.transaction.pk)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "payment_provider_not_configured")

        self.transaction.refresh_from_db()
        self.assertEqual(
            self.transaction.current_state, TRANSACTION_STATES.PENDING_PAYMENT
        )
        self.assertTrue(
            self.transaction.bookings.filter(status=BookingStatus.PENDING).exists()
        )
        self.assertFalse(
            self.transaction.bookings.filter(status=BookingStatus.CONFIRMED).exists()
        )

    def test_capture_payment_requires_verified_flag(self):
        with self.assertRaises(ActionError):
            capture_payment(self.transaction, {})

        payload = {"payment_verified": True}
        capture_payment(self.transaction, payload)
        self.assertEqual(payload["payment"]["status"], "captured")

    def test_confirm_payment_transition_rolls_back_without_verification(self):
        engine = TransactionEngine(self.transaction)
        with self.assertRaises(ActionError):
            engine.transition(
                TRANSACTION_TRANSITIONS.CONFIRM_PAYMENT,
                actor=TRANSACTION_ACTORS.SYSTEM,
            )

        self.transaction.refresh_from_db()
        self.assertEqual(
            self.transaction.current_state, TRANSACTION_STATES.PENDING_PAYMENT
        )
        self.assertEqual(
            self.transaction.bookings.get().status, BookingStatus.PENDING
        )

    def test_confirm_payment_transition_succeeds_when_payment_verified(self):
        engine = TransactionEngine(
            self.transaction, context={"payment_verified": True}
        )
        updated = engine.transition(
            TRANSACTION_TRANSITIONS.CONFIRM_PAYMENT,
            actor=TRANSACTION_ACTORS.SYSTEM,
        )

        self.assertEqual(updated.current_state, TRANSACTION_STATES.CONFIRMED)
        self.assertEqual(
            updated.bookings.get().status, BookingStatus.CONFIRMED
        )
