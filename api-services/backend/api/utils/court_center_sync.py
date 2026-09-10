from __future__ import annotations

from datetime import date, time
from types import SimpleNamespace

from rest_framework import serializers

from api.models import Booking, BookingStatus, Court, CourtCenter, CourtSchedule
from api.utils.slot_index import regenerate_slots_for_court

# Bookings that still hold inventory — schedule edits must keep covering them.
_ACTIVE_BOOKING_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED]


def validate_publish(center: CourtCenter) -> None:
    errors: dict[str, list[str]] = {}

    if not center.title.strip():
        errors["title"] = ["Title is required."]
    if not center.description.strip():
        errors["description"] = ["Description is required."]
    if not center.address:
        errors["address"] = ["Address is required."]
    if center.latitude is None:
        errors["latitude"] = ["Latitude is required."]
    if center.longitude is None:
        errors["longitude"] = ["Longitude is required."]

    courts = list(center.courts.all())
    if not courts:
        errors["courts"] = ["Add at least one court."]

    for court in courts:
        if not court.schedules.exists():
            errors.setdefault("schedules", []).append(
                f'Court "{court.title}" must have at least one availability slot.'
            )
        if court.price_per_hour <= 0:
            errors.setdefault("price_per_hour", []).append(
                f'Court "{court.title}" must have a price per hour greater than 0.'
            )
        if court.price_currency not in ["VND", "USD", "EUR"]:
            errors.setdefault("price_currency", []).append(
                f'Court "{court.title}" must have a valid price currency. Valid currencies are: VND, USD, EUR.'
            )

    if errors:
        raise serializers.ValidationError(errors)


def _slot_fits_schedules(
    schedules: list,
    slot_date: date,
    start: time,
    end: time,
) -> bool:
    day = slot_date.weekday()
    for schedule in schedules:
        if schedule.day_of_week != day:
            continue
        if schedule.start_time <= start and end <= schedule.end_time:
            return True
    return False


def assert_schedules_cover_active_bookings(
    court: Court,
    schedules_data: list[dict],
) -> None:
    """
    Reject schedule payloads that would leave PENDING/CONFIRMED bookings
    outside weekly availability. regenerate_slots_for_court deletes CourtSlot
    rows for removed hours, which would orphan paid holds.
    """
    proposed = [
        SimpleNamespace(
            day_of_week=entry["day_of_week"],
            start_time=entry["start_time"],
            end_time=entry["end_time"],
        )
        for entry in schedules_data
    ]

    today = date.today()
    conflicts = (
        Booking.objects.filter(
            court=court,
            date__gte=today,
            status__in=_ACTIVE_BOOKING_STATUSES,
        )
        .order_by("date", "start_time")
        .only("date", "start_time", "end_time")
    )

    for booking in conflicts:
        if not _slot_fits_schedules(
            proposed,
            booking.date,
            booking.start_time,
            booking.end_time,
        ):
            raise serializers.ValidationError(
                {
                    "schedules": [
                        "Cannot change schedule: an active booking on "
                        f"{booking.date} {booking.start_time}-{booking.end_time} "
                        "would fall outside availability."
                    ]
                }
            )


def sync_court_schedules(court: Court, schedules_data: list[dict]) -> None:
    assert_schedules_cover_active_bookings(court, schedules_data)

    submitted_ids: set[int] = set()

    for schedule_data in schedules_data:
        schedule_id = schedule_data.pop("id", None)

        if schedule_id:
            schedule = CourtSchedule.objects.get(id=schedule_id, court=court)
            for field, value in schedule_data.items():
                setattr(schedule, field, value)
            schedule.save()
        else:
            schedule = CourtSchedule.objects.create(court=court, **schedule_data)

        submitted_ids.add(schedule.id)

    court.schedules.exclude(id__in=submitted_ids).delete()
    regenerate_slots_for_court(court)


def sync_center_schedules(center: CourtCenter, courts_data: list[dict]) -> None:
    for court_payload in courts_data:
        court_id = court_payload.get("id")
        schedules_data = court_payload.get("schedules", [])

        if court_id is None:
            raise serializers.ValidationError(
                {"courts": "Each court entry must include an id."}
            )

        court = Court.objects.get(id=court_id, center=center)
        sync_court_schedules(court, schedules_data)
