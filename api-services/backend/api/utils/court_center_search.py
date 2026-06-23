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
    date_str = query_params.get("date")
    if date_str:
        try:
            params["date"] = date.fromisoformat(date_str)
        except ValueError as exc:
            raise ValidationError({"date": "Use YYYY-MM-DD format."}) from exc
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
    return qs
