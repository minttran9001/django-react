from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models.deletion import ProtectedError
from django.test import TestCase

from api.models import (
    Booking,
    BookingStatus,
    Court,
    CourtCenter,
    Sport,
    Transaction,
)
from api.transaction_process.court_booking import TRANSACTION_STATES


class TransactionUserDeleteProtectTests(TestCase):
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
        self.tx = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.CONFIRMED,
            pay_in_total_amount=Decimal("10.00"),
            pay_in_total_currency="USD",
            pay_out_total_amount=Decimal("10.00"),
            pay_out_total_currency="USD",
        )
        self.booking = Booking.objects.create(
            transaction=self.tx,
            court=self.court,
            user=self.customer,
            status=BookingStatus.CONFIRMED,
            date=date.today() + timedelta(days=3),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )

    def test_deleting_customer_with_paid_booking_is_blocked(self):
        with self.assertRaises(ProtectedError):
            self.customer.delete()

        self.assertTrue(User.objects.filter(pk=self.customer.pk).exists())
        self.assertTrue(Booking.objects.filter(pk=self.booking.pk).exists())
        self.assertTrue(Transaction.objects.filter(pk=self.tx.pk).exists())

    def test_deleting_provider_with_paid_booking_is_blocked(self):
        with self.assertRaises(ProtectedError):
            self.owner.delete()

        self.assertTrue(User.objects.filter(pk=self.owner.pk).exists())
        self.assertTrue(Booking.objects.filter(pk=self.booking.pk).exists())
        self.assertTrue(Transaction.objects.filter(pk=self.tx.pk).exists())

    def test_deleting_user_without_transactions_succeeds(self):
        stray = User.objects.create_user("stray", "stray@test.com", "pass")
        stray_pk = stray.pk
        stray.delete()
        self.assertFalse(User.objects.filter(pk=stray_pk).exists())
