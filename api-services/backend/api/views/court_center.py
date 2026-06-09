from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import Sport

from ..serializers import (
    CourtCenterCreateSerializer,
    CourtCenterDetailSerializer,
    SportSerializer,
)


class SportListView(generics.ListAPIView):
    queryset = Sport.objects.all()
    serializer_class = SportSerializer
    permission_classes = [IsAuthenticated]


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
