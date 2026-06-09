from django.db import models
from .court import Court

class CourtScheduleExceptionType(models.IntegerChoices):
    CANCELED = 0, "Canceled"
    RESCHEDULED = 1, "Rescheduled"
    POSTPONED = 2, "Postponed"
    OTHER = 3, "Other"

class CourtScheduleException(models.Model):
    court = models.ForeignKey(Court, on_delete=models.CASCADE, related_name="schedule_exceptions")
    type = models.IntegerField(choices=CourtScheduleExceptionType.choices)
    reason = models.TextField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.court.title} - {self.type} - {self.reason} - {self.start_time} - {self.end_time}"