from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.test import TestCase

from api.models import (
    Booking,
    BookingStatus,
    Court,
    CourtCenter,
    CourtSchedule,
    CourtSlot,
    Sport,
    Transaction,
)
from api.transaction_process.court_booking import TRANSACTION_STATES
from api.utils.slot_index import extend_slots_horizon


class ExtendSlotsHorizonBookingReapplyTests(TestCase):
    """
    Far-future bookings can exist before CourtSlot rows are generated.
    When the daily horizon extension creates those rows, they must not stay
    available if an active booking already covers them.
    """

    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="x")
        self.customer = User.objects.create_user(username="customer", password="x")
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
            price_per_hour="100000",
            price_currency="VND",
        )
        # Open every day 09:00–12:00 so far-future dates always have slots.
        for day in range(7):
            CourtSchedule.objects.create(
                court=self.court,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(12, 0),
            )

    def test_extend_marks_existing_confirmed_booking_unavailable(self):
        today = date.today()
        # Seed a short near-term horizon so extension will create later dates.
        near = today + timedelta(days=2)
        CourtSlot.objects.create(
            court=self.court,
            date=near,
            start_time=time(9, 0),
            end_time=time(10, 0),
            is_available=True,
        )

        booking_date = today + timedelta(days=10)
        transaction = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.CONFIRMED,
            pay_in_total_amount="100000",
            pay_in_total_currency="VND",
            pay_out_total_amount="90000",
            pay_out_total_currency="VND",
        )
        # Multi-hour booking: both covered hours must be locked after extend.
        Booking.objects.create(
            transaction=transaction,
            court=self.court,
            user=self.customer,
            status=BookingStatus.CONFIRMED,
            date=booking_date,
            start_time=time(9, 0),
            end_time=time(11, 0),
        )

        created = extend_slots_horizon(courts=[self.court], days=14)
        self.assertGreater(created, 0)

        locked = list(
            CourtSlot.objects.filter(
                court=self.court,
                date=booking_date,
                start_time__in=[time(9, 0), time(10, 0)],
            ).values_list("start_time", "is_available")
        )
        self.assertEqual(len(locked), 2)
        self.assertTrue(all(not available for _, available in locked))

        # Untouched hour on the same day stays available.
        free = CourtSlot.objects.get(
            court=self.court,
            date=booking_date,
            start_time=time(11, 0),
        )
        self.assertTrue(free.is_available)
