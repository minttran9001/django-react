from django.db import models

from .court import Court


class CourtSlot(models.Model):
    """
    Precomputed, indexed slot table. One row per 60-minute slot per court per date.
    is_available=True  → slot is open for booking
    is_available=False → slot is taken by an active booking

    Populated by: generate_court_slots management command (initial + daily cron)
    Updated by:   slot_index.regenerate_slots_for_court (schedule edits)
                  slot_index.mark_slots_unavailable     (booking created)
                  slot_index.mark_slots_available_from_bookings (booking cancelled)
    """

    court = models.ForeignKey(Court, on_delete=models.CASCADE, related_name="slots")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = [("court", "date", "start_time")]
        indexes = [
            models.Index(fields=["court", "date", "is_available"]),
            models.Index(fields=["date", "is_available"]),
        ]

    def __str__(self):
        status = "available" if self.is_available else "booked"
        return f"{self.court} | {self.date} {self.start_time}–{self.end_time} ({status})"
