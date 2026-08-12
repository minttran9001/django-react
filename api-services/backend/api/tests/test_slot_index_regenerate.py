"""regenerate_slots_for_court must keep multi-hour bookings unavailable."""

from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from api.models.booking import Booking, BookingStatus
from api.models.court import Court
from api.models.court_center import CourtCenter
from api.models.court_schedule import CourtSchedule
from api.models.court_slot import CourtSlot
from api.models.sport import Sport
from api.models.transaction import Transaction
from api.transaction_process.court_booking import TRANSACTION_STATES
from api.utils.slot_index import regenerate_slots_for_court


class RegenerateMultiHourBookingTests(TestCase):
    def setUp(self):
        owner = User.objects.create_user(username="owner", password="x")
        customer = User.objects.create_user(username="customer", password="x")
        sport = Sport.objects.create(name="Tennis", code="tennis")
        center = CourtCenter.objects.create(
            owner=owner,
            title="Center",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.court = Court.objects.create(
            sport=sport,
            center=center,
            title="Court 1",
            price_per_hour=Decimal("100000"),
            price_currency="VND",
        )
        self.slot_date = date.today() + timedelta(days=3)
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=self.slot_date.weekday(),
            start_time=time(8, 0),
            end_time=time(12, 0),
        )
        transaction = Transaction.objects.create(
            customer=customer,
            provider=owner,
            court=self.court,
            current_state=TRANSACTION_STATES.CONFIRMED,
            pay_in_total_amount=Decimal("200000"),
            pay_in_total_currency="VND",
            pay_out_total_amount=Decimal("180000"),
            pay_out_total_currency="VND",
        )
        # Merged 2-hour hold (as produced by merge_adjacent_slots).
        Booking.objects.create(
            transaction=transaction,
            court=self.court,
            user=customer,
            status=BookingStatus.CONFIRMED,
            date=self.slot_date,
            start_time=time(9, 0),
            end_time=time(11, 0),
        )

    def test_regenerate_marks_all_hourly_slots_for_merged_booking(self):
        regenerate_slots_for_court(self.court, from_date=self.slot_date)

        slots = list(
            CourtSlot.objects.filter(court=self.court, date=self.slot_date)
            .order_by("start_time")
            .values_list("start_time", "is_available")
        )
        by_start = {start: available for start, available in slots}
        self.assertFalse(by_start[time(9, 0)])
        self.assertFalse(by_start[time(10, 0)])
        self.assertTrue(by_start[time(8, 0)])
        self.assertTrue(by_start[time(11, 0)])
