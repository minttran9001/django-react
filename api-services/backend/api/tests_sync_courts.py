from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models import (
    Booking,
    BookingStatus,
    Court,
    CourtCenter,
    Sport,
    Transaction,
)
from api.transaction_process.court_booking import TRANSACTION_STATES
from api.utils.attach_images import sync_courts


class SyncCourtsDeleteGuardTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@test.com", "pass")
        self.customer = User.objects.create_user("customer", "customer@test.com", "pass")
        self.sport = Sport.objects.create(name="Tennis", code="tennis")
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Center",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.court_a = Court.objects.create(
            center=self.center,
            sport=self.sport,
            title="Court A",
            price_per_hour=Decimal("10.00"),
            price_currency="USD",
        )
        self.court_b = Court.objects.create(
            center=self.center,
            sport=self.sport,
            title="Court B",
            price_per_hour=Decimal("10.00"),
            price_currency="USD",
        )

    def _court_payload(self, court: Court) -> dict:
        return {
            "id": court.id,
            "sport": self.sport,
            "title": court.title,
            "description": court.description,
            "price_per_hour": court.price_per_hour,
            "price_currency": court.price_currency,
        }

    def test_removing_court_with_confirmed_booking_raises_and_preserves_data(self):
        tx = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court_a,
            current_state=TRANSACTION_STATES.CONFIRMED,
            pay_in_total_amount=Decimal("10.00"),
            pay_in_total_currency="USD",
            pay_out_total_amount=Decimal("10.00"),
            pay_out_total_currency="USD",
        )
        booking = Booking.objects.create(
            transaction=tx,
            court=self.court_a,
            user=self.customer,
            status=BookingStatus.CONFIRMED,
            date=date.today() + timedelta(days=3),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )

        with self.assertRaises(ValidationError) as ctx:
            sync_courts(self.center, [self._court_payload(self.court_b)], self.owner)

        self.assertIn("courts", ctx.exception.detail)
        self.assertTrue(Court.objects.filter(pk=self.court_a.pk).exists())
        self.assertTrue(Booking.objects.filter(pk=booking.pk).exists())
        self.assertTrue(Transaction.objects.filter(pk=tx.pk).exists())

    def test_removing_court_without_bookings_succeeds(self):
        sync_courts(self.center, [self._court_payload(self.court_b)], self.owner)

        self.assertFalse(Court.objects.filter(pk=self.court_a.pk).exists())
        self.assertTrue(Court.objects.filter(pk=self.court_b.pk).exists())
