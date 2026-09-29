from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import CourtCenter, Sport
from api.utils.app_timezone import timezone_from_query_params
from api.utils.booking_slots import build_available_slots_by_court
from api.utils.court_center_search import (
    apply_search_filters,
    parse_search_params,
    parse_slot_range,
)

from ...serializers import (
    CourtCenterPublicDetailSerializer,
    CourtCenterPublicListSerializer,
    CourtCenterTimeslotsSerializer,
    SportSerializer,
)
from api.utils.typed_resource import RESOURCE_COURT_CENTER, typed_resource

from ._base import (
    LIST_QUERY_OPTIONS,
    PUBLIC_DETAIL_QUERY_OPTIONS,
    get_court_center_queryset,
)


class SportListView(generics.ListAPIView):
    queryset = Sport.objects.all()
    serializer_class = SportSerializer
    permission_classes = [AllowAny]


class CourtCenterCustomerListView(generics.ListAPIView):
    serializer_class = CourtCenterPublicListSerializer
    permission_classes = [AllowAny]
    query_options = LIST_QUERY_OPTIONS

    def get_queryset(self):
        qs = get_court_center_queryset(self.query_options).filter(
            status=CourtCenter.Status.PUBLISHED
        )
        search_params = parse_search_params(self.request.query_params)
        qs = apply_search_filters(
            qs,
            search_params,
            timezone_from_query_params(self.request.query_params),
        )
        if "lat" not in search_params:
            qs = qs.order_by("-created_at")
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        centers = list(page if page is not None else queryset)
        serializer = self.get_serializer(centers, many=True)
        payload = typed_resource(RESOURCE_COURT_CENTER, serializer.data)
        if page is not None:
            return self.get_paginated_response(payload)
        return Response(payload)


class CourtCenterCustomerDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk, *args, **kwargs):
        center = get_object_or_404(
            get_court_center_queryset(PUBLIC_DETAIL_QUERY_OPTIONS),
            pk=pk,
            status=CourtCenter.Status.PUBLISHED,
        )
        serializer = CourtCenterPublicDetailSerializer(
            center,
            context={"owner_visibility": "public"},
        )
        return Response(
            typed_resource(RESOURCE_COURT_CENTER, serializer.data),
            status=status.HTTP_200_OK,
        )


class CourtCenterCustomerTimeslotsView(APIView):
    """Bookable slots per court, read straight off the CourtSlot index."""

    permission_classes = [AllowAny]

    def get(self, request, pk, *args, **kwargs):
        center = get_object_or_404(
            CourtCenter,
            pk=pk,
            status=CourtCenter.Status.PUBLISHED,
        )
        tz = timezone_from_query_params(request.query_params)
        date_from, date_to = parse_slot_range(request.query_params, tz)
        courts = list(center.courts.only("id"))
        slots_by_court = build_available_slots_by_court(
            courts,
            tz=tz,
            date_from=date_from,
            date_to=date_to,
        )
        serializer = CourtCenterTimeslotsSerializer({
            "date_from": date_from,
            "date_to": date_to,
            "courts": [
                {"court": court.id, "slots": slots_by_court.get(court.id, [])}
                for court in courts
            ],
        })
        return Response(serializer.data, status=status.HTTP_200_OK)
