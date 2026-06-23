from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import CourtCenter, Sport
from api.utils.app_timezone import timezone_from_query_params
from api.utils.booking_slots import build_available_slots_by_court
from api.utils.court_center_search import apply_search_filters, parse_search_params

from ..serializers import CourtCenterPublicDetailSerializer, SportSerializer

from ._base import build_slot_context, get_court_center_queryset, resolve_slot_date


class SportListView(generics.ListAPIView):
    queryset = Sport.objects.all()
    serializer_class = SportSerializer
    permission_classes = [AllowAny]


class CourtCenterCustomerListView(generics.ListAPIView):
    serializer_class = CourtCenterPublicDetailSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = get_court_center_queryset().filter(
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
        courts = [court for center in centers for court in center.courts.all()]
        tz = timezone_from_query_params(request.query_params)
        slot_date = resolve_slot_date(request.query_params, tz)
        context = {
            **self.get_serializer_context(),
            "owner_visibility": "public",
            "slot_date": slot_date,
            "available_slots_by_court": build_available_slots_by_court(
                courts,
                slot_date,
                tz,
            ),
        }
        serializer = self.serializer_class(centers, many=True, context=context)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class CourtCenterCustomerDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk, *args, **kwargs):
        center = get_object_or_404(
            get_court_center_queryset(),
            pk=pk,
            status=CourtCenter.Status.PUBLISHED,
        )
        serializer = CourtCenterPublicDetailSerializer(
            center,
            context=build_slot_context(request, center),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
