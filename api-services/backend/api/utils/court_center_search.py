import math
from datetime import date

from zoneinfo import ZoneInfo

from django.db.models import ExpressionWrapper, F, FloatField, Q, QuerySet
from django.db.models.functions import ACos, Cos, Radians, Sin
from rest_framework.exceptions import ValidationError

from api.models import CourtCenter
from api.utils.app_timezone import DEFAULT_TIMEZONE, now_time_in_tz, today_in_tz


def apply_location_filter(
    qs: QuerySet[CourtCenter],
    lat: float,
    lng: float,
    radius_km: float,
) -> QuerySet[CourtCenter]:
    qs = qs.filter(
        latitude__isnull=False,
        longitude__isnull=False,
    )
    # Haversine distance in km
    lat_rad = Radians(F("latitude"))
    lng_rad = Radians(F("longitude"))
    center_lat_rad = math.radians(lat)
    center_lng_rad = math.radians(lng)
    distance_expr = ExpressionWrapper(
        6371 * ACos(
            Cos(center_lat_rad)
            * Cos(lat_rad)
            * Cos(lng_rad - center_lng_rad)
            + Sin(center_lat_rad) * Sin(lat_rad)
        ),
        output_field=FloatField(),
    )
    return (
        qs.annotate(distance_km=distance_expr)
        .filter(distance_km__lte=radius_km)
        .order_by("distance_km")
    )

def parse_optional_date(query_params, key: str) -> date | None:
    raw = query_params.get(key)
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise ValidationError({key: "Use YYYY-MM-DD format."}) from exc


def parse_slot_range(
    query_params,
    tz: ZoneInfo = DEFAULT_TIMEZONE,
) -> tuple[date, date]:
    """Single `date`, or `date_from`+`date_to`. Defaults to today."""
    search_date = parse_optional_date(query_params, "date")
    date_from = parse_optional_date(query_params, "date_from")
    date_to = parse_optional_date(query_params, "date_to")
    validate_slot_range_params(search_date, date_from, date_to)

    if search_date:
        return search_date, search_date
    if date_from and date_to:
        return date_from, date_to
    today = today_in_tz(tz)
    return today, today


def validate_slot_range_params(
    search_date: date | None,
    date_from: date | None,
    date_to: date | None,
) -> None:
    if search_date and (date_from or date_to):
        raise ValidationError("Use either date or date_from/date_to, not both.")
    if (date_from is None) != (date_to is None):
        raise ValidationError("Both date_from and date_to are required.")
    if date_from and date_to and date_from > date_to:
        raise ValidationError({"date_from": "Must be on or before date_to."})


def parse_search_params(query_params) -> dict:
    """Read and validate ?lat=&lng=&radius_km=&sport_id=&q=&date="""
    params = {}
    lat = query_params.get("lat")
    lng = query_params.get("lng")
    if lat or lng:
        if not (lat and lng):
            raise ValidationError("Both lat and lng are required for location search.")
        try:
            params["lat"] = float(lat)
            params["lng"] = float(lng)
            params["radius_km"] = float(query_params.get("radius_km", 20))
        except ValueError as exc:
            raise ValidationError("Invalid location or radius values.") from exc
        if params["radius_km"] <= 0:
            raise ValidationError({"radius_km": "Must be greater than 0."})
    sport_ids = query_params.get("sport_ids")
    if sport_ids:
        try:
            params["sport_ids"] = [int(sport_id) for sport_id in sport_ids.split(",")]
        except ValueError as exc:
            raise ValidationError({"sport_ids": "Must be a comma-separated list of integers."}) from exc
    q = query_params.get("q", "").strip()
    if q:
        params["q"] = q
    search_date = parse_optional_date(query_params, "date")
    date_from = parse_optional_date(query_params, "date_from")
    date_to = parse_optional_date(query_params, "date_to")
    validate_slot_range_params(search_date, date_from, date_to)
    if search_date:
        params["date"] = search_date
    if date_from and date_to:
        params["date_from"] = date_from
        params["date_to"] = date_to
    return params



def apply_sport_filter(qs: QuerySet[CourtCenter], sport_ids: list[int]) -> QuerySet[CourtCenter]:
    return qs.filter(courts__sport_id__in=sport_ids).distinct()

def apply_keyword_filter(qs: QuerySet[CourtCenter], q: str) -> QuerySet[CourtCenter]:
    return qs.filter(
        Q(title__icontains=q) |
        Q(description__icontains=q) |
        Q(address__icontains=q) |
        Q(courts__title__icontains=q)
    ).distinct()

def apply_date_filter(
    qs: QuerySet[CourtCenter],
    search_date: date,
    tz: ZoneInfo = DEFAULT_TIMEZONE,
) -> QuerySet[CourtCenter]:
    """Single indexed JOIN — no Python slot math, no booking scan."""
    today = today_in_tz(tz)
    if search_date < today:
        return qs.none()

    filters = {
        "courts__slots__date": search_date,
        "courts__slots__is_available": True,
    }
    if search_date == today:
        filters["courts__slots__start_time__gt"] = now_time_in_tz(tz)

    return qs.filter(**filters).distinct()

def apply_search_filters(qs, search_params: dict, tz: ZoneInfo = DEFAULT_TIMEZONE):
    if "lat" in search_params:
        qs = apply_location_filter(
            qs,
            search_params["lat"],
            search_params["lng"],
            search_params["radius_km"],
        )
    if sport_ids := search_params.get("sport_ids"):
        qs = apply_sport_filter(qs, sport_ids)
    if q := search_params.get("q"):
        qs = apply_keyword_filter(qs, q)
    if search_date := search_params.get("date"):
        qs = apply_date_filter(qs, search_date, tz)
    elif search_params.get("date_from") and search_params.get("date_to"):
        qs = apply_date_range_filter(
            qs,
            search_params["date_from"],
            search_params["date_to"],
            tz,
        )
    return qs

def apply_date_range_filter(qs, date_from, date_to, tz=DEFAULT_TIMEZONE):
    if date_from > date_to:
        raise ValidationError({"date_from": "Must be on or before date_to."})
    today = today_in_tz(tz)
    if date_to < today:
        return qs.none()
    date_from = max(date_from, today)
    filters = Q(
        courts__slots__date__gte=date_from,
        courts__slots__date__lte=date_to,
        courts__slots__is_available=True,
    )
    if date_from == today:
        filters &= (
            Q(courts__slots__date__gt=today)
            | Q(courts__slots__start_time__gt=now_time_in_tz(tz))
        )
    return qs.filter(filters).distinct()

