from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.models import CourtCenter, Sport

from ..serializers import (
    CourtCenterCreateSerializer,
    CourtCenterDetailSerializer,
    SportSerializer,
)


def get_court_center_queryset():
    return CourtCenter.objects.prefetch_related(
        "courts__sport",
        "images",
    ).order_by("-created_at")


class SportListView(generics.ListAPIView):
    queryset = Sport.objects.all()
    serializer_class = SportSerializer
    permission_classes = [IsAuthenticated]


class CourtCenterCustomerListView(generics.ListAPIView):
    serializer_class = CourtCenterDetailSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return get_court_center_queryset()


class MyCourtCenterListView(generics.ListAPIView):
    serializer_class = CourtCenterDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_court_center_queryset().filter(owner=self.request.user)


class CourtCenterCreateView(generics.CreateAPIView):
    serializer_class = CourtCenterCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        center = serializer.save()
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_201_CREATED,
        )
