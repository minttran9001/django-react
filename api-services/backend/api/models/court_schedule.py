from django.db import models
from .court import Court

class DayOfWeek(models.IntegerChoices):
    MONDAY = 0, "Monday"
    TUESDAY = 1, "Tuesday"
    WEDNESDAY = 2, "Wednesday"
    THURSDAY = 3, "Thursday"
    FRIDAY = 4, "Friday"
    SATURDAY = 5, "Saturday"
    SUNDAY = 6, "Sunday"

class CourtSchedule(models.Model):
    court = models.ForeignKey(Court, on_delete=models.CASCADE, related_name="schedules")
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)    
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["court", "day_of_week"]),
        ]

    def __str__(self):
        return f"{self.court.title} - {self.day_of_week} - {self.start_time} - {self.end_time}"