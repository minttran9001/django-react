from datetime import date, datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone
from rest_framework.exceptions import ValidationError

DEFAULT_TIMEZONE = ZoneInfo("UTC")


def resolve_timezone(tz_name: str | None) -> ZoneInfo:
    if not tz_name or not str(tz_name).strip():
        return DEFAULT_TIMEZONE
    try:
        return ZoneInfo(str(tz_name).strip())
    except ZoneInfoNotFoundError as exc:
        raise ValidationError({"timezone": "Invalid timezone."}) from exc


def timezone_from_query_params(query_params) -> ZoneInfo:
    return resolve_timezone(query_params.get("timezone"))


def now_in_tz(tz: ZoneInfo) -> datetime:
    return timezone.now().astimezone(tz)


def today_in_tz(tz: ZoneInfo) -> date:
    return now_in_tz(tz).date()


def now_time_in_tz(tz: ZoneInfo) -> time:
    return now_in_tz(tz).time().replace(microsecond=0)


def is_slot_start_in_past(slot_date: date, start: time, tz: ZoneInfo) -> bool:
    """True when a wall-clock slot start is already over for slot_date in tz."""
    today = today_in_tz(tz)
    if slot_date < today:
        return True
    if slot_date == today and start <= now_time_in_tz(tz):
        return True
    return False
