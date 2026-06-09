from django.db.models import Prefetch
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User

from api.models import Court, CourtCenter, Sport
from api.utils.permission import IsOwnerOrReadOnly

from ..serializers import (
    CourtCenterWriteSerializer,
    CourtCenterDetailSerializer,
    SportSerializer,
)

def get_court_center_queryset():
    return CourtCenter.objects.prefetch_related(
        "images",
        Prefetch(
            "courts",
            queryset=Court.objects.prefetch_related("images").select_related("sport"),
        ),
    ).order_by("-created_at")

def is_court_center_owner(court_center: CourtCenter, user: User):
    return court_center.owner == user


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


class CourtCenterCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = CourtCenterWriteSerializer(
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
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_object(self, request, *args, **kwargs):
        court_center_id = kwargs.get("pk")
        center = get_court_center_queryset().get(pk=court_center_id, owner=request.user)
        self.check_object_permissions(request, center)
        return center

    def get(self, request, *args, **kwargs):
        center = self.get_object(request, *args, **kwargs)
        return Response(
            CourtCenterDetailSerializer(center).data,
            status=status.HTTP_200_OK,
        )

    ## partial update
    def patch(self, request, *args, **kwargs):
        center = self.get_object(request, *args, **kwargs)
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

    def delete(self, request, *args, **kwargs):
        center = self.get_object(request, *args, **kwargs)
        center.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)