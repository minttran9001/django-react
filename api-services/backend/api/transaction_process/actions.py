from decimal import Decimal
from typing import TYPE_CHECKING

from api.models.booking import Booking, BookingStatus
from api.models.court import Court
from api.transaction_process.court_booking import TRANSACTION_ACTIONS
from api.utils.booking_pricing import build_line_items
from api.utils.booking_slots import validate_slots_are_available_for_court

if TYPE_CHECKING:
    from api.models.transaction import Transaction


class ActionError(Exception):
    pass


def _require_slots(transaction: "Transaction", context: dict) -> list[dict]:
    slots = context.get("slots")
    if not slots:
        raise ActionError("Transition context must include 'slots'.")
    return slots


def _load_court(transaction: "Transaction") -> Court:
    return (
        Court.objects.select_related("center")
        .prefetch_related("schedules")
        .get(pk=transaction.court_id)
    )


def _compute_pay_out(line_items: list[dict], currency: str) -> dict:
    slot_total = Decimal("0")
    provider_fee = Decimal("0")
    for item in line_items:
        amount = Decimal(str(item["line_total"]["amount"]))
        if item["type"] == "booking_slot":
            slot_total += amount
        elif item["type"] == "provider_platform_fee":
            provider_fee += amount
    return {"amount": slot_total - provider_fee, "currency": currency}


def reserve_bookings(transaction: "Transaction", context: dict) -> None:
    slots = _require_slots(transaction, context)
    court = _load_court(transaction)
    validate_slots_are_available_for_court(slots, court)

    bookings = [
        Booking(
            transaction=transaction,
            court=court,
            user=transaction.customer,
            status=BookingStatus.PENDING,
            date=slot["date"],
            start_time=slot["start"],
            end_time=slot["end"],
        )
        for slot in slots
    ]
    Booking.objects.bulk_create(bookings)


def snapshot_line_items(transaction: "Transaction", context: dict) -> None:
    slots = _require_slots(transaction, context)
    court = _load_court(transaction)
    quote = build_line_items(court, slots, include_for=["customer", "provider"])
    pay_out = _compute_pay_out(quote["line_items"], quote["pay_in_total"]["currency"])

    transaction.line_items = quote["line_items"]
    transaction.pay_in_total_amount = quote["pay_in_total"]["amount"]
    transaction.pay_in_total_currency = quote["pay_in_total"]["currency"]
    transaction.pay_out_total_amount = pay_out["amount"]
    transaction.pay_out_total_currency = pay_out["currency"]
    transaction.save(
        update_fields=[
            "line_items",
            "pay_in_total_amount",
            "pay_in_total_currency",
            "pay_out_total_amount",
            "pay_out_total_currency",
            "updated_at",
        ]
    )


def create_payment(transaction: "Transaction", context: dict) -> None:
    context["payment"] = {
        "status": "pending",
        "payment_url": f"/checkout/transactions/{transaction.pk}",
    }


def confirm_bookings(transaction: "Transaction", context: dict) -> None:
    transaction.bookings.filter(status=BookingStatus.PENDING).update(
        status=BookingStatus.CONFIRMED
    )


def cancel_bookings(transaction: "Transaction", context: dict) -> None:
    transaction.bookings.exclude(status=BookingStatus.CANCELLED).update(
        status=BookingStatus.CANCELLED
    )


def capture_payment(transaction: "Transaction", context: dict) -> None:
    context["payment"] = {"status": "captured"}


def refund_payment(transaction: "Transaction", context: dict) -> None:
    context["payment"] = {"status": "refunded"}


def payout_funds(transaction: "Transaction", context: dict) -> None:
    context["payout"] = {"status": "completed"}


ACTION_HANDLERS = {
    TRANSACTION_ACTIONS.RESERVE_BOOKINGS: reserve_bookings,
    TRANSACTION_ACTIONS.SNAPSHOT_LINE_ITEMS: snapshot_line_items,
    TRANSACTION_ACTIONS.CREATE_PAYMENT: create_payment,
    TRANSACTION_ACTIONS.CONFIRM_BOOKINGS: confirm_bookings,
    TRANSACTION_ACTIONS.CANCEL_BOOKINGS: cancel_bookings,
    TRANSACTION_ACTIONS.CAPTURE_PAYMENT: capture_payment,
    TRANSACTION_ACTIONS.REFUND_PAYMENT: refund_payment,
    TRANSACTION_ACTIONS.PAYOUT_FUNDS: payout_funds,
}


def run_action(action: str, transaction: "Transaction", context: dict) -> None:
    handler = ACTION_HANDLERS.get(action)
    if handler is None:
        raise ActionError(f"Unknown action: {action}")
    handler(transaction, context)
