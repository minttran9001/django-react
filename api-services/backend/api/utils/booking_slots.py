from datetime import date, datetime, time

from django.utils import timezone
from rest_framework import serializers

from api.models import Booking, BookingStatus, Court
from api.serializers.line_items import SlotInputSerializer

ACTIVE_BOOKING_STATUSES = [BookingStatus.PENDING]
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


def slots_are_adjacent(end_a, start_b, tolerance_minutes: int = 0) -> bool:
    gap = (
        datetime.combine(date.min, start_b) - datetime.combine(date.min, end_a)
    ).total_seconds() / 60
    return 0 <= gap <= tolerance_minutes


def merge_adjacent_slots(
    slots: list[SlotInputSerializer],
    tolerance_minutes: int = 0,
) -> list[SlotInputSerializer]:
    if not slots:
        return []
    merged: list[SlotInputSerializer] = []
    for slot_date in sorted({s["date"] for s in slots}):
        day_slots = sorted(
            (s for s in slots if s["date"] == slot_date),
            key=lambda s: s["start"],
        )
        current = dict(day_slots[0])
        for next_slot in day_slots[1:]:
            if slots_are_adjacent(current["end"], next_slot["start"], tolerance_minutes):
                current["end"] = max(current["end"], next_slot["end"])
            else:
                merged.append(current)
                current = dict(next_slot)
        merged.append(current)
    return merged


def expand_slot_to_hourly_specs(slot: SlotInputSerializer) -> list[dict]:
    """Expand a slot (possibly multi-hour) into 60-minute specs for the slot index."""
    specs: list[dict] = []
    cursor = _time_to_minutes(slot["start"])
    end_min = _time_to_minutes(slot["end"])
    while cursor + ALLOWED_SLOT_DURATION_MINUTES <= end_min:
        specs.append({
            "date": slot["date"],
            "start": _minutes_to_time(cursor),
        })
        cursor += ALLOWED_SLOT_DURATION_MINUTES
    return specs


def bookings_to_slot_specs(bookings) -> list[dict]:
    specs: list[dict] = []
    for booking in bookings:
        specs.extend(expand_slot_to_hourly_specs({
            "date": booking.date,
            "start": booking.start_time,
            "end": booking.end_time,
        }))
    return specs


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
    """Read available slots from the precomputed CourtSlot index. O(1) queries."""
    if not courts:
        return {}

    from api.models.court_slot import CourtSlot  # avoid circular at module level

    court_ids = [court.id for court in courts]
    rows = CourtSlot.objects.filter(
        court_id__in=court_ids,
        date=slot_date,
        is_available=True,
    ).values("court_id", "date", "start_time", "end_time").order_by("start_time")

    result: dict[int, list[dict]] = {court.id: [] for court in courts}
    for row in rows:
        result[row["court_id"]].append({
            "date": row["date"],
            "start": row["start_time"],
            "end": row["end_time"],
        })
    return result


def get_court_ids_with_available_slots(
    slot_date: date,
    court_queryset=None,
) -> set[int]:
    """Single indexed query against CourtSlot. No Python slot math."""
    from api.models.court_slot import CourtSlot  # avoid circular at module level

    qs = court_queryset if court_queryset is not None else Court.objects.all()
    return set(
        CourtSlot.objects.filter(
            court__in=qs,
            date=slot_date,
            is_available=True,
        ).values_list("court_id", flat=True).distinct()
    )


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
