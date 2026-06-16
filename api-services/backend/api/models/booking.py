from django.contrib.auth.models import User
from django.db import models

from .court import Court


class BookingStatus(models.IntegerChoices):
    PENDING = 0, "Pending"
    CONFIRMED = 1, "Confirmed"
    CANCELLED = 2, "Cancelled"


class Booking(models.Model):
    transaction = models.ForeignKey(
        "Transaction",
        on_delete=models.CASCADE,
        related_name="bookings",
        null=True,
        blank=True,
    )
    court = models.ForeignKey(Court, on_delete=models.CASCADE, related_name="bookings")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings")
    status = models.IntegerField(choices=BookingStatus.choices, default=BookingStatus.PENDING)
    start_time = models.TimeField()
    end_time = models.TimeField()
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.court.title} - {self.user.email} - {self.status}"
