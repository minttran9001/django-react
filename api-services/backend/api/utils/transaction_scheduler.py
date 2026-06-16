"""
Run due system transitions (payment expiry, booking completion).

Trigger definitions live in court_booking.py; this module finds matching
transactions and delegates to TransactionEngine.run_due_system_transitions().
"""

from __future__ import annotations

from datetime import timedelta
from typing import TypedDict

from django.db.models import Prefetch
from django.utils import timezone

from api.models.booking import Booking
from api.models.transaction import Transaction
from api.transaction_process import (
    COURT_BOOKING_PROCESS,
    TRANSACTION_STATES,
    TRANSACTION_TRANSITIONS,
    TransactionEngine,
    TransitionError,
)


class TransitionRunResult(TypedDict):
    expired: int
    completed: int
    errors: list[str]


def _payment_expiry_seconds() -> int:
    config = COURT_BOOKING_PROCESS["transitions"][TRANSACTION_TRANSITIONS.EXPIRE_PAYMENT]
    return config["trigger"]["after_seconds"]


def _run_engine_for_transaction(transaction: Transaction) -> str | None:
    engine = TransactionEngine(transaction)
    updated = engine.run_due_system_transitions()
    if updated is None:
        return None

    transition = updated.last_transition
    if transition == TRANSACTION_TRANSITIONS.EXPIRE_PAYMENT:
        return "expired"
    if transition == TRANSACTION_TRANSITIONS.COMPLETE:
        return "completed"
    return transition


def process_due_system_transitions() -> TransitionRunResult:
    result: TransitionRunResult = {"expired": 0, "completed": 0, "errors": []}
    expiry_cutoff = timezone.now() - timedelta(seconds=_payment_expiry_seconds())

    pending_qs = Transaction.objects.filter(
        process_name=COURT_BOOKING_PROCESS["name"],
        current_state=TRANSACTION_STATES.PENDING_PAYMENT,
        last_transition_at__lte=expiry_cutoff,
    ).order_by("last_transition_at")

    for transaction in pending_qs:
        try:
            outcome = _run_engine_for_transaction(transaction)
            if outcome == "expired":
                result["expired"] += 1
        except TransitionError as exc:
            result["errors"].append(f"transaction {transaction.pk} expire: {exc}")

    confirmed_qs = (
        Transaction.objects.filter(
            process_name=COURT_BOOKING_PROCESS["name"],
            current_state=TRANSACTION_STATES.CONFIRMED,
        )
        .prefetch_related(
            Prefetch("bookings", queryset=Booking.objects.order_by("date", "end_time")),
        )
        .order_by("id")
    )

    now = timezone.now()
    for transaction in confirmed_qs:
        latest_end = transaction.latest_end_at
        if latest_end is None or now < latest_end:
            continue

        try:
            outcome = _run_engine_for_transaction(transaction)
            if outcome == "completed":
                result["completed"] += 1
        except TransitionError as exc:
            result["errors"].append(f"transaction {transaction.pk} complete: {exc}")

    return result
