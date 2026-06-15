from api.models import Booking, BookingStatus, Court
from api.serializers.line_items import SlotInputSerializer
from datetime import date
from django.utils import timezone
from datetime import datetime
from rest_framework import serializers

ACTIVE_BOOKING_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED]
ALLOWED_SLOT_DURATION_MINUTES = 60

def slot_duration_minutes(start, end) -> int:
    delta = datetime.combine(date.min, end) - datetime.combine(date.min, start)
    return int(delta.total_seconds() // ALLOWED_SLOT_DURATION_MINUTES)

def date_to_day_of_week(slot_date: date) -> int:
    return slot_date.weekday() 

def slot_fits_weekly_schedule(court: Court, slot_date: date, start, end) -> bool:
    day = date_to_day_of_week(slot_date)
    day_schedules = court.schedules.filter(day_of_week=day)
    for schedule in day_schedules:
        if schedule.start_time <= start and end <= schedule.end_time:
            return True
    return False

def times_overlap(start_a, end_a, start_b, end_b) -> bool:
    return start_a < end_b and start_b < end_a




def validate_slots_are_available_for_court(slots: list[SlotInputSerializer], court: Court) -> None:
    if not slots:
        raise serializers.ValidationError({"slots": "At least one slot is required."})
    now = timezone.localtime()
    today = now.date()
    now_time = now.time()
    # 1. Past + duration + schedule
    for slot in slots:
        slot_date = slot["date"]
        start = slot["start"]
        end = slot["end"]
        if slot_date < today or (slot_date == today and start <= now_time):
            raise serializers.ValidationError({
                "slots": f"Slot {slot_date} {start}-{end} is in the past."
            })
        if slot_duration_minutes(start, end) != 60:
            raise serializers.ValidationError({
                "slots": f"Slot {slot_date} {start}-{end} must be 60 minutes."
            })
        if not slot_fits_weekly_schedule(court, slot_date, start, end):
            raise serializers.ValidationError({
                "slots": f"Slot {slot_date} {start}-{end} is outside court availability."
            })
    # 2. Overlaps within request (same date)
    sorted_slots = sorted(slots, key=lambda s: (s["date"], s["start"]))
    for i, slot in enumerate(sorted_slots):
        for other in sorted_slots[i + 1:]:
            if slot["date"] != other["date"]:
                continue
            if times_overlap(slot["start"], slot["end"], other["start"], other["end"]):
                raise serializers.ValidationError({"slots": "Requested slots overlap."})
    # 3. Existing bookings — one query for all dates
    dates = {s["date"] for s in slots}
    existing = Booking.objects.filter(
        court=court,
        date__in=dates,
        status__in=ACTIVE_BOOKING_STATUSES,
    ).values("date", "start_time", "end_time")
    for slot in slots:
        for booking in existing:
            if booking["date"] != slot["date"]:
                continue
            if times_overlap(
                slot["start"], slot["end"],
                booking["start_time"], booking["end_time"],
            ):
                raise serializers.ValidationError({
                    "slots": f"Slot {slot['date']} {slot['start']}-{slot['end']} is already booked."
                })
