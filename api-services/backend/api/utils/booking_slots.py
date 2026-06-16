from datetime import date, datetime, time

from django.utils import timezone
from rest_framework import serializers

from api.models import Booking, BookingStatus, Court
from api.serializers.line_items import SlotInputSerializer

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


def _time_to_minutes(value: time) -> int:
    return value.hour * 60 + value.minute


def _minutes_to_time(minutes: int) -> time:
    return time(hour=minutes // 60, minute=minutes % 60)


def generate_schedule_slots_for_date(
    court: Court,
    slot_date: date,
    duration_minutes: int = ALLOWED_SLOT_DURATION_MINUTES,
) -> list[tuple[time, time]]:
    day = date_to_day_of_week(slot_date)
    schedules = court.schedules.filter(day_of_week=day)
    slots: list[tuple[time, time]] = []

    for schedule in schedules:
        start_min = _time_to_minutes(schedule.start_time)
        end_min = _time_to_minutes(schedule.end_time)
        cursor = start_min
        while cursor + duration_minutes <= end_min:
            slots.append(
                (
                    _minutes_to_time(cursor),
                    _minutes_to_time(cursor + duration_minutes),
                )
            )
            cursor += duration_minutes

    slots.sort(key=lambda pair: pair[0])
    return slots


def get_available_slots_for_court(
    court: Court,
    slot_date: date,
    booked_ranges: list[tuple[time, time]] | None = None,
) -> list[dict]:
    candidates = generate_schedule_slots_for_date(court, slot_date)
    now = timezone.localtime()
    today = now.date()
    now_time = now.time()

    if booked_ranges is None:
        booked_ranges = list(
            Booking.objects.filter(
                court=court,
                date=slot_date,
                status__in=ACTIVE_BOOKING_STATUSES,
            ).values_list("start_time", "end_time")
        )

    available: list[dict] = []
    for start, end in candidates:
        if slot_date < today or (slot_date == today and start <= now_time):
            continue
        if any(
            times_overlap(start, end, booked_start, booked_end)
            for booked_start, booked_end in booked_ranges
        ):
            continue
        available.append({"date": slot_date, "start": start, "end": end})

    return available


def build_available_slots_by_court(
    courts: list[Court],
    slot_date: date,
) -> dict[int, list[dict]]:
    if not courts:
        return {}

    court_ids = [court.id for court in courts]
    bookings = Booking.objects.filter(
        court_id__in=court_ids,
        date=slot_date,
        status__in=ACTIVE_BOOKING_STATUSES,
    ).values_list("court_id", "start_time", "end_time")

    bookings_by_court: dict[int, list[tuple[time, time]]] = {}
    for court_id, start, end in bookings:
        bookings_by_court.setdefault(court_id, []).append((start, end))

    return {
        court.id: get_available_slots_for_court(
            court,
            slot_date,
            booked_ranges=bookings_by_court.get(court.id, []),
        )
        for court in courts
    }


def get_court_ids_with_available_slots(
    slot_date: date,
    court_queryset=None,
) -> set[int]:
    day = date_to_day_of_week(slot_date)
    qs = court_queryset if court_queryset is not None else Court.objects.all()
    courts = list(
        qs.filter(schedules__day_of_week=day)
        .prefetch_related("schedules")
        .distinct()
    )
    slots_by_court = build_available_slots_by_court(courts, slot_date)
    return {
        court_id
        for court_id, slots in slots_by_court.items()
        if slots
    }


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
