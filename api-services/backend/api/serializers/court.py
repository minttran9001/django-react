from rest_framework import serializers

from api.models import Court, Sport, CourtCenter

from .court_center import CourtCenterSerializer
from .court_schedule import CourtScheduleExceptionSerializer, CourtScheduleSerializer
from .sport import SportSerializer
from .money import MoneySerializer


class CourtSerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    sport_id = serializers.PrimaryKeyRelatedField(
        queryset=Sport.objects.all(),
        source="sport",
        write_only=True,
    )
    center = CourtCenterSerializer(read_only=True)
    center_id = serializers.PrimaryKeyRelatedField(
        queryset=CourtCenter.objects.all(),
        source="center",
        write_only=True,
    )
    schedules = CourtScheduleSerializer(many=True, read_only=True)
    schedule_exceptions = CourtScheduleExceptionSerializer(many=True, read_only=True)
    price_per_hour = MoneySerializer(required=False)

    class Meta:
        model = Court
        fields = [
            "id",
            "sport",
            "sport_id",
            "center",
            "center_id",
            "title",
            "description",
            "schedules",
            "schedule_exceptions",
            "price_per_hour",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
