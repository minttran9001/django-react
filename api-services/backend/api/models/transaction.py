from datetime import datetime

from django.contrib.auth.models import User
from django.db import models

from api.transaction_process import COURT_BOOKING_PROCESS, TRANSACTION_STATES, TRANSACTION_TRANSITIONS


class Transaction(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    current_state = models.IntegerField(
        choices=TRANSACTION_STATES.choices,
        default=TRANSACTION_STATES.INITIAL,
    )
    process_name = models.CharField(max_length=64, default=COURT_BOOKING_PROCESS["name"])
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="transactions")
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name="provider_transactions")
    court = models.ForeignKey("Court", on_delete=models.CASCADE, related_name="transactions")
    line_items = models.JSONField(default=list)
    last_transition_at = models.DateTimeField(auto_now_add=True)
    last_transition = models.CharField(
        max_length=32,
        choices=TRANSACTION_TRANSITIONS.choices,
        blank=True,
    )
    pay_in_total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    pay_in_total_currency = models.CharField(max_length=3)
    pay_out_total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    pay_out_total_currency = models.CharField(max_length=3)

    @property
    def latest_end_at(self) -> datetime | None:
        latest = None
        for booking in self.bookings.all():
            end_at = datetime.combine(booking.date, booking.end_time)
            if latest is None or end_at > latest:
                latest = end_at
        return latest
