from rest_framework import serializers

from api.models import Court

from ..line_items import SlotInputSerializer
from ..money import MoneySerializer
from ..sport import SportSerializer
from ..image import ImageResourceSerializer
from ..court_schedule import CourtScheduleSerializer

from .base import CourtCenterSerializer


class CourtSummarySerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    images = ImageResourceSerializer(source="gallery", many=True, read_only=True)
    schedules = CourtScheduleSerializer(many=True, read_only=True)
    price_per_hour = serializers.SerializerMethodField()

    class Meta:
        model = Court
        fields = [
            "id",
            "sport",
            "title",
            "description",
            "images",
            "schedules",
            "price_per_hour",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_price_per_hour(self, court):
        return MoneySerializer({
            "amount": court.price_per_hour,
            "currency": court.price_currency,
        }).data


class CourtPublicSummarySerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    images = ImageResourceSerializer(source="gallery", many=True, read_only=True)
    available_slots = serializers.SerializerMethodField()
    price_per_hour = serializers.SerializerMethodField()

    class Meta:
        model = Court
        fields = [
            "id",
            "sport",
            "title",
            "description",
            "images",
            "available_slots",
            "price_per_hour",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_available_slots(self, court):
        slots_by_court = self.context.get("available_slots_by_court", {})
        slots = slots_by_court.get(court.id, [])
        return SlotInputSerializer(slots, many=True).data

    def get_price_per_hour(self, court):
        return MoneySerializer({
            "amount": court.price_per_hour,
            "currency": court.price_currency,
        }).data


class CourtCenterDetailSerializer(CourtCenterSerializer):
    courts = CourtSummarySerializer(many=True, read_only=True)

    class Meta(CourtCenterSerializer.Meta):
        fields = [*CourtCenterSerializer.Meta.fields, "courts"]


class CourtCenterPublicDetailSerializer(CourtCenterSerializer):
    courts = CourtPublicSummarySerializer(many=True, read_only=True)

    class Meta(CourtCenterSerializer.Meta):
        fields = [*CourtCenterSerializer.Meta.fields, "courts"]
