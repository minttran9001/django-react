"""
Slot index: manages the CourtSlot precomputed availability table.

Write paths (must be called explicitly):
  regenerate_slots_for_court()        — after schedule edits
  mark_slots_unavailable()            — after bookings are created (reserve)
  mark_slots_available_from_bookings()— after bookings are cancelled/expired
  extend_slots_horizon()              — run daily via management command

Read paths (used by search & listing):
  CourtSlot.objects.filter(date=X, is_available=True, ...)
"""

from __future__ import annotations

from datetime import date, time, timedelta

from django.db.models import Q

from api.models.booking import Booking, BookingStatus
from api.models.court import Court
from api.models.court_slot import CourtSlot

ACTIVE_BOOKING_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED]
SLOT_DURATION_MINUTES = 60
SLOT_GENERATION_DAYS = 60


# ---------------------------------------------------------------------------
# Internal slot generation (works on in-memory schedule objects – no extra DB queries)
# ---------------------------------------------------------------------------

def _time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _minutes_to_time(m: int) -> time:
    return time(m // 60, m % 60)


def _generate_slots_from_schedules(
    schedules: list,
    slot_date: date,
    duration: int = SLOT_DURATION_MINUTES,
) -> list[tuple[time, time]]:
    """
    Generate (start, end) pairs for a date from an in-memory schedule list.
    Filters by day_of_week in Python — safe to call in a loop without extra queries
    as long as schedules is already fully loaded (e.g. from prefetch_related).
    """
    day = slot_date.weekday()
    result: list[tuple[time, time]] = []
    for s in schedules:
        if s.day_of_week != day:
            continue
        start_min = _time_to_minutes(s.start_time)
        end_min = _time_to_minutes(s.end_time)
        cursor = start_min
        while cursor + duration <= end_min:
            result.append((_minutes_to_time(cursor), _minutes_to_time(cursor + duration)))
            cursor += duration
    result.sort()
    return result


# ---------------------------------------------------------------------------
# Write operations
# ---------------------------------------------------------------------------

def regenerate_slots_for_court(court: Court, from_date: date | None = None) -> None:
    """
    Delete all future CourtSlot rows for a court and rebuild from its current schedules.
    Call this whenever a court's CourtSchedule records change.

    Uses court.schedules.all() — prefetch it before calling if batching many courts.
    """
    today = date.today()
    start = max(from_date or today, today)
    horizon = today + timedelta(days=SLOT_GENERATION_DAYS)

    CourtSlot.objects.filter(court=court, date__gte=start).delete()

    schedules = list(court.schedules.all())
    to_create: list[CourtSlot] = []
    d = start
    while d <= horizon:
        for start_t, end_t in _generate_slots_from_schedules(schedules, d):
            to_create.append(CourtSlot(
                court=court,
                date=d,
                start_time=start_t,
                end_time=end_t,
                is_available=True,
            ))
        d += timedelta(days=1)

    if to_create:
        CourtSlot.objects.bulk_create(to_create)

    # Re-apply any active bookings that fall inside the rebuilt range
    active = list(
        Booking.objects.filter(
            court=court,
            date__gte=start,
            date__lte=horizon,
            status__in=ACTIVE_BOOKING_STATUSES,
        ).values_list("date", "start_time")
    )
    if active:
        q = Q()
        for booking_date, start_t in active:
            q |= Q(date=booking_date, start_time=start_t)
        CourtSlot.objects.filter(court=court).filter(q).update(is_available=False)


def mark_slots_unavailable(court_id: int, slot_specs: list[dict]) -> None:
    """
    Mark specific slots as taken (is_available=False).
    slot_specs: list of {"date": date, "start": time}
    Call after Booking rows are created via reserve_bookings.
    """
    if not slot_specs:
        return
    q = Q()
    for spec in slot_specs:
        q |= Q(date=spec["date"], start_time=spec["start"])
    CourtSlot.objects.filter(court_id=court_id).filter(q).update(is_available=False)


def mark_slots_available_from_bookings(court_id: int, booking_queryset) -> None:
    """
    Release slots back to available when bookings are cancelled or expired.
    booking_queryset should be filtered to only the bookings being released
    BEFORE their status is updated.
    """
    specs = list(booking_queryset.values_list("date", "start_time"))
    if not specs:
        return
    q = Q()
    for booking_date, start_t in specs:
        q |= Q(date=booking_date, start_time=start_t)
    CourtSlot.objects.filter(court_id=court_id).filter(q).update(is_available=True)


# ---------------------------------------------------------------------------
# Horizon extension (run daily)
# ---------------------------------------------------------------------------

def extend_slots_horizon(
    courts: list[Court] | None = None,
    days: int = SLOT_GENERATION_DAYS,
) -> int:
    """
    Extend slot coverage so every court has rows up to today + days.
    Idempotent — only adds rows for dates not yet present.
    Returns the number of new CourtSlot rows inserted.
    """
    from api.models.court_center import CourtCenter  # avoid circular at module level

    if courts is None:
        queryset = Court.objects.prefetch_related("schedules").filter(
            center__status=CourtCenter.Status.PUBLISHED,
        )
    else:
        queryset = Court.objects.prefetch_related("schedules").filter(
            pk__in=[c.pk for c in courts],
        )

    today = date.today()
    horizon = today + timedelta(days=days)
    total_created = 0

    for court in queryset:
        latest = (
            CourtSlot.objects
            .filter(court=court)
            .order_by("-date")
            .values_list("date", flat=True)
            .first()
        )
        start = (latest + timedelta(days=1)) if latest else today
        if start > horizon:
            continue

        schedules = list(court.schedules.all())  # uses prefetch cache
        to_create: list[CourtSlot] = []
        d = start
        while d <= horizon:
            for start_t, end_t in _generate_slots_from_schedules(schedules, d):
                to_create.append(CourtSlot(
                    court=court,
                    date=d,
                    start_time=start_t,
                    end_time=end_t,
                    is_available=True,
                ))
            d += timedelta(days=1)

        if to_create:
            CourtSlot.objects.bulk_create(to_create, ignore_conflicts=True)
            total_created += len(to_create)

    return total_created


def prune_past_slots(before_date: date | None = None) -> int:
    """Delete slot rows for past dates to keep the table lean."""
    cutoff = before_date or date.today()
    deleted, _ = CourtSlot.objects.filter(date__lt=cutoff).delete()
    return deleted
