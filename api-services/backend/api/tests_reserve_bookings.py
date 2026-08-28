"""Regression tests for initiate/reserve booking concurrency."""

from __future__ import annotations

from datetime import date, time, timedelta
from decimal import Decimal
from unittest import skipUnless
from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import connection, transaction as db_transaction
from django.db.models import QuerySet
from django.test import TestCase, TransactionTestCase
from rest_framework.exceptions import ValidationError

from api.models import (
    Booking,
    BookingStatus,
    Court,
    CourtCenter,
    CourtSchedule,
    Sport,
    Transaction,
)
from api.transaction_process.actions import reserve_bookings
from api.transaction_process.base import TransactionEngine
from api.transaction_process.court_booking import (
    TRANSACTION_ACTORS,
    TRANSACTION_STATES,
    TRANSACTION_TRANSITIONS,
)


def _next_weekday(day_of_week: int) -> date:
    today = date.today() + timedelta(days=1)
    while today.weekday() != day_of_week:
        today += timedelta(days=1)
    return today


class ReserveBookingsLockTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@example.com", "pass")
        self.customer = User.objects.create_user(
            "customer", "customer@example.com", "pass"
        )
        self.other = User.objects.create_user("other", "other@example.com", "pass")
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
            price_per_hour=Decimal("100000"),
            price_currency="VND",
        )
        self.day = 0  # Monday
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=self.day,
            start_time=time(8, 0),
            end_time=time(22, 0),
        )
        self.slot_date = _next_weekday(self.day)
        self.slots = [
            {
                "date": self.slot_date,
                "start": time(10, 0),
                "end": time(11, 0),
            }
        ]

    def _new_transaction(self, customer: User) -> Transaction:
        return Transaction(
            customer=customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.INITIAL,
            pay_in_total_amount=Decimal("0"),
            pay_in_total_currency="VND",
            pay_out_total_amount=Decimal("0"),
            pay_out_total_currency="VND",
        )

    def test_second_initiate_for_same_slot_is_rejected(self):
        first = TransactionEngine(
            self._new_transaction(self.customer),
            context={"slots": self.slots},
        ).transition(
            TRANSACTION_TRANSITIONS.INITIATE,
            actor=TRANSACTION_ACTORS.CUSTOMER,
        )
        self.assertEqual(first.current_state, TRANSACTION_STATES.PENDING_PAYMENT)
        self.assertEqual(
            Booking.objects.filter(
                court=self.court,
                status=BookingStatus.PENDING,
            ).count(),
            1,
        )

        with self.assertRaises(ValidationError):
            TransactionEngine(
                self._new_transaction(self.other),
                context={"slots": self.slots},
            ).transition(
                TRANSACTION_TRANSITIONS.INITIATE,
                actor=TRANSACTION_ACTORS.CUSTOMER,
            )

        self.assertEqual(
            Booking.objects.filter(
                court=self.court,
                status=BookingStatus.PENDING,
            ).count(),
            1,
        )

    def test_reserve_bookings_locks_court_row(self):
        tx = self._new_transaction(self.customer)
        tx.save()
        original = QuerySet.select_for_update
        calls: list[bool] = []

        def tracking_select_for_update(self, *args, **kwargs):
            calls.append(True)
            return original(self, *args, **kwargs)

        with patch.object(QuerySet, "select_for_update", tracking_select_for_update):
            with db_transaction.atomic():
                reserve_bookings(tx, {"slots": self.slots})

        self.assertTrue(calls, "reserve_bookings must call select_for_update")


@skipUnless(connection.vendor == "postgresql", "Requires Postgres row locks")
class ConcurrentReserveBookingsTests(TransactionTestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner2", "owner2@example.com", "pass")
        self.customer_a = User.objects.create_user("a", "a@example.com", "pass")
        self.customer_b = User.objects.create_user("b", "b@example.com", "pass")
        self.sport = Sport.objects.create(name="Badminton", code="badminton")
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Center 2",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.court = Court.objects.create(
            center=self.center,
            sport=self.sport,
            title="Court A",
            price_per_hour=Decimal("50000"),
            price_currency="VND",
        )
        self.day = 2
        CourtSchedule.objects.create(
            court=self.court,
            day_of_week=self.day,
            start_time=time(8, 0),
            end_time=time(22, 0),
        )
        self.slot_date = _next_weekday(self.day)
        self.slots = [
            {
                "date": self.slot_date,
                "start": time(14, 0),
                "end": time(15, 0),
            }
        ]

    def _new_transaction(self, customer: User) -> Transaction:
        return Transaction(
            customer=customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.INITIAL,
            pay_in_total_amount=Decimal("0"),
            pay_in_total_currency="VND",
            pay_out_total_amount=Decimal("0"),
            pay_out_total_currency="VND",
        )

    def test_concurrent_initiates_only_one_succeeds(self):
        import threading

        results: list[str] = []
        barrier = threading.Barrier(2)

        def attempt(customer: User):
            try:
                barrier.wait(timeout=5)
                TransactionEngine(
                    self._new_transaction(customer),
                    context={"slots": self.slots},
                ).transition(
                    TRANSACTION_TRANSITIONS.INITIATE,
                    actor=TRANSACTION_ACTORS.CUSTOMER,
                )
                results.append("ok")
            except Exception:
                results.append("err")

        threads = [
            threading.Thread(target=attempt, args=(self.customer_a,)),
            threading.Thread(target=attempt, args=(self.customer_b,)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=15)

        self.assertEqual(results.count("ok"), 1)
        self.assertEqual(results.count("err"), 1)
        self.assertEqual(
            Booking.objects.filter(
                court=self.court,
                date=self.slot_date,
                start_time=time(14, 0),
                status=BookingStatus.PENDING,
            ).count(),
            1,
        )
