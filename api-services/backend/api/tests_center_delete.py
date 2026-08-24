from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import (
    Booking,
    BookingStatus,
    Court,
    CourtCenter,
    Sport,
    Transaction,
)
from api.transaction_process.court_booking import TRANSACTION_STATES


class CourtCenterDeleteGuardTests(TestCase):
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
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

    def test_delete_center_with_confirmed_booking_is_rejected(self):
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

        response = self.client.delete(f"/api/court-centers/mine/{self.center.pk}")

        self.assertEqual(response.status_code, 400)
        self.assertTrue(CourtCenter.objects.filter(pk=self.center.pk).exists())
        self.assertTrue(Court.objects.filter(pk=self.court.pk).exists())
        self.assertTrue(Booking.objects.filter(pk=booking.pk).exists())
        self.assertTrue(Transaction.objects.filter(pk=tx.pk).exists())

    def test_delete_center_without_bookings_succeeds(self):
        response = self.client.delete(f"/api/court-centers/mine/{self.center.pk}")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(CourtCenter.objects.filter(pk=self.center.pk).exists())
        self.assertFalse(Court.objects.filter(pk=self.court.pk).exists())
