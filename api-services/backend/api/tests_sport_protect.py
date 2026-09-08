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


class SportDeleteProtectTests(TestCase):
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

    def test_deleting_sport_with_court_and_booking_is_blocked(self):
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
        booking = Booking.objects.create(
            transaction=tx,
            court=self.court,
            user=self.customer,
            status=BookingStatus.CONFIRMED,
            date=date.today() + timedelta(days=3),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )

        with self.assertRaises(ProtectedError):
            self.sport.delete()

        self.assertTrue(Sport.objects.filter(pk=self.sport.pk).exists())
        self.assertTrue(Court.objects.filter(pk=self.court.pk).exists())
        self.assertTrue(Booking.objects.filter(pk=booking.pk).exists())
        self.assertTrue(Transaction.objects.filter(pk=tx.pk).exists())

    def test_deleting_unused_sport_succeeds(self):
        unused = Sport.objects.create(name="Unused", code="unused")
        unused_pk = unused.pk
        unused.delete()
        self.assertFalse(Sport.objects.filter(pk=unused_pk).exists())
