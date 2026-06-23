from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import CourtCenter
from api.utils.court_center_sync import validate_publish
from api.utils.exceptions import validation_error_response

from ...serializers import (
    CourtCenterArchiveSerializer,
    CourtCenterCourtsSerializer,
    CourtCenterDetailSerializer,
    CourtCenterDraftCreateSerializer,
    CourtCenterLocationSerializer,
    CourtCenterSchedulesSerializer,
    CourtCenterWriteSerializer,
)

from ._base import get_court_center_queryset, get_owned_court_center


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

    def _get_patch_serializer(self, center, data, request):
        if "courts" in data:
            return CourtCenterCourtsSerializer(
                center,
                data=data,
                context={"request": request},
                partial=True,
            )
        if any(key in data for key in ("address", "latitude", "longitude")):
            return CourtCenterLocationSerializer(
                center,
                data=data,
                partial=True,
            )
        return CourtCenterWriteSerializer(
            center,
            data=data,
            context={"request": request},
            partial=True,
        )

    def get(self, request, pk, *args, **kwargs):
        center = self.get_object(request, pk)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk, *args, **kwargs):
        center = self.get_object(request, pk)
        serializer = self._get_patch_serializer(center, request.data, request)

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
        center = get_owned_court_center(request, pk)

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


class MyCourtCenterArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        center = get_owned_court_center(
            request,
            pk,
            status=CourtCenter.Status.PUBLISHED,
        )
        serializer = CourtCenterArchiveSerializer(
            center,
            data=request.data,
            partial=True,
        )
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        center = serializer.save()
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_200_OK,
        )
