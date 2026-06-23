from datetime import date

from django.db.models import Prefetch
from rest_framework.exceptions import ValidationError

from api.models import Court, CourtCenter
from api.utils.app_timezone import today_in_tz, timezone_from_query_params
from api.utils.booking_slots import build_available_slots_by_court


def resolve_slot_date(query_params, tz) -> date:
    date_str = query_params.get("date")
    if date_str:
        try:
            return date.fromisoformat(date_str)
        except ValueError as exc:
            raise ValidationError({"date": "Use YYYY-MM-DD format."}) from exc
    return today_in_tz(tz)


def build_slot_context(request, center: CourtCenter) -> dict:
    tz = timezone_from_query_params(request.query_params)
    slot_date = resolve_slot_date(request.query_params, tz)
    courts = list(center.courts.all())
    return {
        "owner_visibility": "public",
        "slot_date": slot_date,
        "available_slots_by_court": build_available_slots_by_court(courts, slot_date, tz),
    }


def get_court_center_queryset():
    return CourtCenter.objects.select_related(
        "owner",
        "owner__profile",
        "owner__profile__avatar",
    ).prefetch_related(
        "images",
        Prefetch(
            "courts",
            queryset=Court.objects.prefetch_related(
                "images",
                "schedules",
            ).select_related("sport"),
        ),
    ).order_by("-created_at")


def get_owned_court_center(request, pk, status=CourtCenter.Status.DRAFT):
    return get_court_center_queryset().get(
        pk=pk,
        owner=request.user,
        status=status,
    )
