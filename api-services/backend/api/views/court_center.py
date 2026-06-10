from django.db.models import Prefetch
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Court, CourtCenter, Sport

from ..serializers import (
    CourtCenterCourtsSerializer,
    CourtCenterDetailSerializer,
    CourtCenterDraftCreateSerializer,
    CourtCenterLocationSerializer,
    CourtCenterSchedulesSerializer,
    CourtCenterWriteSerializer,
    SportSerializer,
)
from ..utils.court_center_sync import validate_publish


def get_court_center_queryset():
    return CourtCenter.objects.prefetch_related(
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
    permission_classes = [IsAuthenticated]


class CourtCenterCustomerListView(generics.ListAPIView):
    serializer_class = CourtCenterDetailSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return get_court_center_queryset().filter(status=CourtCenter.Status.PUBLISHED)


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
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        center = serializer.save()
        center = get_court_center_queryset().get(pk=center.pk)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_201_CREATED,
        )


class MyCourtCenterDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_court_center_queryset().get(pk=pk, owner=request.user)

    def get(self, request, pk, *args, **kwargs):
        center = self.get_object(request, pk)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk, *args, **kwargs):
        center = self.get_object(request, pk)

        if center.status != CourtCenter.Status.DRAFT:
            return Response(
                {"detail": "Only draft listings can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        center = get_owned_draft(request, pk)
        serializer = CourtCenterSchedulesSerializer(
            center,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        center.status = CourtCenter.Status.PUBLISHED
        center.save(update_fields=["status", "updated_at"])
        center = get_court_center_queryset().get(pk=center.pk)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_200_OK,
        )
