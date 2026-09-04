from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase, TransactionTestCase

from api.models import Court, CourtCenter, CourtSchedule, CourtSlot, Sport
from api.utils.slot_index import regenerate_slots_for_court


class RegenerateSlotsOverlappingSchedulesTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner@example.com",
            email="owner@example.com",
            password="pass",
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
            title="Court 1",
            price_per_hour="100000.00",
            price_currency="VND",
        )
        # Seed an existing horizon so a failed rebuild would visibly wipe availability.
        tomorrow = date.today() + timedelta(days=1)
        CourtSlot.objects.create(
            court=self.court,
            date=tomorrow,
            start_time=time(8, 0),
            end_time=time(9, 0),
            is_available=True,
        )

    def test_overlapping_schedules_do_not_wipe_slots(self):
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=tomorrow_weekday(),
            start_time=time(8, 0),
            end_time=time(12, 0),
        )
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=tomorrow_weekday(),
            start_time=time(10, 0),
            end_time=time(14, 0),
        )

        regenerate_slots_for_court(self.court)

        tomorrow = date.today() + timedelta(days=1)
        starts = list(
            CourtSlot.objects.filter(court=self.court, date=tomorrow)
            .order_by("start_time")
            .values_list("start_time", flat=True)
        )
        self.assertEqual(
            starts,
            [
                time(8, 0),
                time(9, 0),
                time(10, 0),
                time(11, 0),
                time(12, 0),
                time(13, 0),
            ],
        )
        self.assertEqual(
            CourtSlot.objects.filter(court=self.court, date=tomorrow).count(),
            len(starts),
        )


class RegenerateSlotsAtomicityTests(TransactionTestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner2@example.com",
            email="owner2@example.com",
            password="pass",
        )
        self.sport = Sport.objects.create(name="Badminton", code="badminton")
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Center 2",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.court = Court.objects.create(
            center=self.center,
            sport=self.sport,
            title="Court 2",
            price_per_hour="100000.00",
            price_currency="VND",
        )
        self.preserved = CourtSlot.objects.create(
            court=self.court,
            date=date.today() + timedelta(days=1),
            start_time=time(8, 0),
            end_time=time(9, 0),
            is_available=True,
        )

    def test_failed_rebuild_rolls_back_delete(self):
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=(date.today() + timedelta(days=1)).weekday(),
            start_time=time(8, 0),
            end_time=time(10, 0),
        )

        original_bulk_create = CourtSlot.objects.bulk_create

        def boom(objs, *args, **kwargs):
            raise IntegrityError("simulated unique violation")

        CourtSlot.objects.bulk_create = boom  # type: ignore[method-assign]
        try:
            with self.assertRaises(IntegrityError):
                regenerate_slots_for_court(self.court)
        finally:
            CourtSlot.objects.bulk_create = original_bulk_create  # type: ignore[method-assign]

        self.assertTrue(
            CourtSlot.objects.filter(pk=self.preserved.pk).exists(),
            "delete must roll back when bulk_create fails",
        )


def tomorrow_weekday() -> int:
    return (date.today() + timedelta(days=1)).weekday()
