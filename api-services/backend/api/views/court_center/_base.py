from django.db.models import Prefetch

from api.models import Court, CourtCenter
from api.utils.app_timezone import timezone_from_query_params
from api.utils.booking_slots import build_available_slots_by_court
from api.utils.court_center_search import parse_slot_range


def build_slot_context(request, center: CourtCenter) -> dict:
    tz = timezone_from_query_params(request.query_params)
    date_from, date_to = parse_slot_range(request.query_params, tz)
    courts = list(center.courts.all())
    return {
        "owner_visibility": "public",
        "slot_date": date_from,
        "date_from": date_from,
        "date_to": date_to,
        "available_slots_by_court": build_available_slots_by_court(
            courts,
            tz=tz,
            date_from=date_from,
            date_to=date_to,
        ),
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
