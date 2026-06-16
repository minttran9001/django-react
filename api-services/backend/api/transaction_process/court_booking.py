from django.db import models


class TRANSACTION_STATES(models.IntegerChoices):
    INITIAL = 0, "Initial"  # virtual only — never persisted
    PENDING_PAYMENT = 1, "Pending payment"
    PAYMENT_EXPIRED = 2, "Payment expired"
    CONFIRMED = 3, "Confirmed"
    COMPLETED = 4, "Completed"
    CANCELLED = 5, "Cancelled"


class TRANSACTION_ACTIONS(models.TextChoices):
    RESERVE_BOOKINGS = "reserve_bookings", "Reserve bookings"
    SNAPSHOT_LINE_ITEMS = "snapshot_line_items", "Snapshot line items"
    CONFIRM_BOOKINGS = "confirm_bookings", "Confirm bookings"
    CANCEL_BOOKINGS = "cancel_bookings", "Cancel bookings"
    CREATE_PAYMENT = "create_payment", "Create payment"
    CAPTURE_PAYMENT = "capture_payment", "Capture payment"
    REFUND_PAYMENT = "refund_payment", "Refund payment"
    PAYOUT_FUNDS = "payout_funds", "Payout funds"


class TRANSACTION_TRANSITIONS(models.TextChoices):
    INITIATE = "initiate", "Initiate"
    CONFIRM_PAYMENT = "confirm_payment", "Confirm payment"
    CANCEL_PAYMENT = "cancel_payment", "Cancel payment"
    CANCEL = "cancel", "Cancel"
    EXPIRE_PAYMENT = "expire_payment", "Expire payment"
    COMPLETE = "complete", "Complete"


class TRANSACTION_ACTORS(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    SYSTEM = "system", "System"
    PROVIDER = "provider", "Provider"


COURT_BOOKING_PROCESS = {
    "name": "court-booking",
    "initial_state": TRANSACTION_STATES.INITIAL,
    "states": {
        TRANSACTION_STATES.PENDING_PAYMENT: {"label": "Awaiting payment"},
        TRANSACTION_STATES.CONFIRMED: {"label": "Confirmed"},
        TRANSACTION_STATES.COMPLETED: {"label": "Completed"},
        TRANSACTION_STATES.CANCELLED: {"label": "Cancelled"},
        TRANSACTION_STATES.PAYMENT_EXPIRED: {"label": "Payment expired"},
    },
    "transitions": {
        # INITIATE -> PENDING_PAYMENT
        TRANSACTION_TRANSITIONS.INITIATE: {
            "from": TRANSACTION_STATES.INITIAL,
            "to": TRANSACTION_STATES.PENDING_PAYMENT,
            "actor": TRANSACTION_ACTORS.CUSTOMER,
            "actions": [
                TRANSACTION_ACTIONS.RESERVE_BOOKINGS,
                TRANSACTION_ACTIONS.SNAPSHOT_LINE_ITEMS,
                TRANSACTION_ACTIONS.CREATE_PAYMENT,
            ],
        },
        # PENDING_PAYMENT -> PAYMENT_EXPIRED
        TRANSACTION_TRANSITIONS.EXPIRE_PAYMENT: {
            "from": TRANSACTION_STATES.PENDING_PAYMENT,
            "to": TRANSACTION_STATES.PAYMENT_EXPIRED,
            "actor": TRANSACTION_ACTORS.SYSTEM,
            "actions": [TRANSACTION_ACTIONS.CANCEL_BOOKINGS],
            "trigger": {
                "type": "duration",
                "from_state": TRANSACTION_STATES.PENDING_PAYMENT,
                "after_seconds": 15 * 60,
            },
        },
        # PENDING_PAYMENT -> CANCELLED
        TRANSACTION_TRANSITIONS.CANCEL_PAYMENT: {
            "from": TRANSACTION_STATES.PENDING_PAYMENT,
            "to": TRANSACTION_STATES.CANCELLED,
            "actor": TRANSACTION_ACTORS.CUSTOMER,
            "actions": [TRANSACTION_ACTIONS.CANCEL_BOOKINGS],
        },
        # PENDING_PAYMENT -> CONFIRMED
        TRANSACTION_TRANSITIONS.CONFIRM_PAYMENT: {
            "from": TRANSACTION_STATES.PENDING_PAYMENT,
            "to": TRANSACTION_STATES.CONFIRMED,
            "actor": TRANSACTION_ACTORS.SYSTEM,
            "actions": [
                TRANSACTION_ACTIONS.CONFIRM_BOOKINGS,
                TRANSACTION_ACTIONS.CAPTURE_PAYMENT,
            ],
        },
        # CONFIRMED -> CANCELLED (before the booking starts)
        TRANSACTION_TRANSITIONS.CANCEL: {
            "from": TRANSACTION_STATES.CONFIRMED,
            "to": TRANSACTION_STATES.CANCELLED,
            "actor": [TRANSACTION_ACTORS.CUSTOMER, TRANSACTION_ACTORS.PROVIDER],
            "actions": [
                TRANSACTION_ACTIONS.CANCEL_BOOKINGS,
                TRANSACTION_ACTIONS.REFUND_PAYMENT,
            ],
        },
        # CONFIRMED -> COMPLETED (after the last slot ends)
        TRANSACTION_TRANSITIONS.COMPLETE: {
            "from": TRANSACTION_STATES.CONFIRMED,
            "to": TRANSACTION_STATES.COMPLETED,
            "actor": TRANSACTION_ACTORS.SYSTEM,
            "actions": [TRANSACTION_ACTIONS.PAYOUT_FUNDS],
            "trigger": {
                "type": "datetime",
                "source": "bookings.latest_end_at",
            },
        },
    },
}
