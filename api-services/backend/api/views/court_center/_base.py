from dataclasses import dataclass

from django.db.models import Prefetch, QuerySet

from api.models import Court, CourtCenter


@dataclass(frozen=True)
class CourtCenterQueryOptions:
    """What to JOIN/prefetch. Flip flags when a serializer field is added."""

    owner_avatar: bool = False
    court_images: bool = False
    court_schedules: bool = False
    court_sport: bool = False
    slim_courts: bool = False


LIST_QUERY_OPTIONS = CourtCenterQueryOptions(slim_courts=True)
DETAIL_QUERY_OPTIONS = CourtCenterQueryOptions(
    owner_avatar=True,
    court_images=True,
    court_schedules=True,
    court_sport=True,
)
# CourtPublicSummarySerializer omits schedules, so don't prefetch them.
PUBLIC_DETAIL_QUERY_OPTIONS = CourtCenterQueryOptions(
    owner_avatar=True,
    court_images=True,
    court_sport=True,
)


def get_court_center_queryset(
    options: CourtCenterQueryOptions = DETAIL_QUERY_OPTIONS,
) -> QuerySet[CourtCenter]:
    owner_related = ["owner", "owner__profile"]
    if options.owner_avatar:
        owner_related.append("owner__profile__avatar")

    courts = Court.objects.all()
    if options.slim_courts:
        courts = courts.only("id", "title", "sport_id", "center_id")
    if options.court_sport:
        courts = courts.select_related("sport")
    court_prefetches: list[str] = []
    if options.court_images:
        court_prefetches.append("images")
    if options.court_schedules:
        court_prefetches.append("schedules")
    if court_prefetches:
        courts = courts.prefetch_related(*court_prefetches)

    return (
        CourtCenter.objects.select_related(*owner_related)
        .prefetch_related("images", Prefetch("courts", queryset=courts))
        .order_by("-created_at")
    )


def get_court_center_list_queryset():
    return get_court_center_queryset(LIST_QUERY_OPTIONS)


def get_owned_court_center(request, pk, status=CourtCenter.Status.DRAFT):
    return get_court_center_queryset().get(
        pk=pk,
        owner=request.user,
        status=status,
    )
