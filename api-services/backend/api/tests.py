from datetime import date, datetime, time, timezone as dt_timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from django.test import TestCase

from api.models.booking import Booking, BookingStatus
from api.models.court import Court
from api.models.court_center import CourtCenter
from api.models.sport import Sport
from api.models.transaction import Transaction
from api.transaction_process.court_booking import TRANSACTION_STATES


class TransactionLatestEndAtTimezoneTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user("customer", "c@example.com", "pw")
        self.provider = User.objects.create_user("provider", "p@example.com", "pw")
        self.sport = Sport.objects.create(name="Tennis", code="tennis")
        self.center = CourtCenter.objects.create(
            owner=self.provider,
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

    def _transaction(self, *, timezone_name: str) -> Transaction:
        return Transaction.objects.create(
            customer=self.customer,
            provider=self.provider,
            court=self.court,
            current_state=TRANSACTION_STATES.CONFIRMED,
            pay_in_total_amount=Decimal("100000"),
            pay_in_total_currency="VND",
            pay_out_total_amount=Decimal("90000"),
            pay_out_total_currency="VND",
            timezone=timezone_name,
        )

    def test_latest_end_at_uses_booking_timezone_not_utc(self):
        txn = self._transaction(timezone_name="America/Los_Angeles")
        Booking.objects.create(
            transaction=txn,
            court=self.court,
            user=self.customer,
            status=BookingStatus.CONFIRMED,
            date=date(2026, 9, 17),
            start_time=time(18, 0),
            end_time=time(19, 0),
        )

        end_at = txn.latest_end_at
        self.assertIsNotNone(end_at)
        self.assertEqual(end_at.tzinfo, ZoneInfo("America/Los_Angeles"))
        self.assertEqual(end_at.hour, 19)
        # Old bug treated 19:00 as UTC; correct LA (PDT) end is 02:00 UTC next day.
        self.assertEqual(
            end_at.astimezone(dt_timezone.utc),
            datetime(2026, 9, 18, 2, 0, tzinfo=dt_timezone.utc),
        )

    def test_latest_end_at_asia_timezone(self):
        txn = self._transaction(timezone_name="Asia/Ho_Chi_Minh")
        Booking.objects.create(
            transaction=txn,
            court=self.court,
            user=self.customer,
            status=BookingStatus.CONFIRMED,
            date=date(2026, 9, 17),
            start_time=time(18, 0),
            end_time=time(19, 0),
        )

        end_at = txn.latest_end_at
        self.assertEqual(
            end_at.astimezone(dt_timezone.utc),
            datetime(2026, 9, 17, 12, 0, tzinfo=dt_timezone.utc),
        )
