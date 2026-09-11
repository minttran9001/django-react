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


class CourtCenterOwnerDeleteProtectTests(TestCase):
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

    def test_deleting_owner_with_center_and_booking_is_blocked(self):
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
            self.owner.delete()

        self.assertTrue(User.objects.filter(pk=self.owner.pk).exists())
        self.assertTrue(CourtCenter.objects.filter(pk=self.center.pk).exists())
        self.assertTrue(Court.objects.filter(pk=self.court.pk).exists())
        self.assertTrue(Booking.objects.filter(pk=booking.pk).exists())
        self.assertTrue(Transaction.objects.filter(pk=tx.pk).exists())

    def test_deleting_user_without_centers_succeeds(self):
        stray = User.objects.create_user("stray", "stray@test.com", "pass")
        stray_pk = stray.pk
        stray.delete()
        self.assertFalse(User.objects.filter(pk=stray_pk).exists())
