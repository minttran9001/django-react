from datetime import date

from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Court, CourtCenter, Sport
from api.utils.booking_slots import build_available_slots_by_court

from ..serializers import (
    CourtCenterCourtsSerializer,
    CourtCenterDetailSerializer,
    CourtCenterDraftCreateSerializer,
    CourtCenterLocationSerializer,
    CourtCenterPublicDetailSerializer,
    CourtCenterSchedulesSerializer,
    CourtCenterWriteSerializer,
    SportSerializer,
)
from ..utils.court_center_sync import validate_publish
from ..utils.court_center_search import apply_search_filters, parse_search_params
from ..utils.exceptions import validation_error_response



def resolve_slot_date(query_params) -> date:
    date_str = query_params.get("date")
    if date_str:
        try:
            return date.fromisoformat(date_str)
        except ValueError as exc:
            raise ValidationError({"date": "Use YYYY-MM-DD format."}) from exc
    return timezone.localdate()


def build_public_serializer_context(request, center: CourtCenter) -> dict:
    slot_date = resolve_slot_date(request.query_params)
    courts = list(center.courts.all())
    return {
        "owner_visibility": "public",
        "slot_date": slot_date,
        "available_slots_by_court": build_available_slots_by_court(courts, slot_date),
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


def get_owned_draft(request, pk):
    return get_court_center_queryset().get(
        pk=pk,
        owner=request.user,
        status=CourtCenter.Status.DRAFT,
    )


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
        qs = apply_search_filters(qs, search_params)
        if "lat" not in search_params:
            qs = qs.order_by("-created_at")
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        target = page if page is not None else queryset

        # Evaluate once; stash courts so get_serializer_context can reuse
        # them without issuing a second full queryset evaluation.
        evaluated = list(target)
        self._courts_for_context = [
            court for center in evaluated for court in center.courts.all()
        ]

        serializer = self.get_serializer(evaluated, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        slot_date = resolve_slot_date(self.request.query_params)
        courts = getattr(self, "_courts_for_context", None)
        if courts is None:
            # Fallback (e.g. schema generation): build from queryset
            courts = [
                court
                for center in self.filter_queryset(self.get_queryset())
                for court in center.courts.all()
            ]
        context["owner_visibility"] = "public"
        context["slot_date"] = slot_date
        context["available_slots_by_court"] = build_available_slots_by_court(
            courts,
            slot_date,
        )
        return context


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
            context=build_public_serializer_context(request, center),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class MyCourtCenterListView(generics.ListAPIView):
    serializer_class = CourtCenterDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_court_center_queryset().filter(owner=self.request.user)


class CourtCenterDraftCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = CourtCenterDraftCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)

        center = serializer.save()
        center = get_court_center_queryset().get(pk=center.pk)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_201_CREATED,
        )


class MyCourtCenterDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(
            get_court_center_queryset(),
            pk=pk,
            owner=request.user,
        )

    def get(self, request, pk, *args, **kwargs):
        center = self.get_object(request, pk)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk, *args, **kwargs):
        center = self.get_object(request, pk)

        if "courts" in request.data:
            serializer = CourtCenterCourtsSerializer(
                center,
                data=request.data,
                context={"request": request},
                partial=True,
            )
        elif any(
            key in request.data
            for key in ("address", "latitude", "longitude")
        ):
            serializer = CourtCenterLocationSerializer(
                center,
                data=request.data,
                partial=True,
            )
        else:
            serializer = CourtCenterWriteSerializer(
                center,
                data=request.data,
                context={"request": request},
                partial=True,
            )

        if not serializer.is_valid():
            return validation_error_response(serializer.errors)

        center = serializer.save()
        center = get_court_center_queryset().get(pk=center.pk)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk, *args, **kwargs):
        center = self.get_object(request, pk)
        center.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyCourtCenterSchedulesView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, *args, **kwargs):
        center = get_court_center_queryset().get(pk=pk, owner=request.user)
        serializer = CourtCenterSchedulesSerializer(
            center,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return validation_error_response(serializer.errors)

        center = serializer.save()
        center = get_court_center_queryset().get(pk=center.pk)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_200_OK,
        )


class MyCourtCenterPublishView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        center = get_owned_draft(request, pk)

        try:
            validate_publish(center)
        except ValidationError as exc:
            return validation_error_response(exc.detail)

        center.status = CourtCenter.Status.PUBLISHED
        center.save(update_fields=["status", "updated_at"])
        center = get_court_center_queryset().get(pk=center.pk)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_200_OK,
        )
