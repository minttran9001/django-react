from rest_framework import serializers

from api.models import Court, CourtCenter

from ..image import PrefetchedCenterImagesMixin, PrefetchedGalleryMixin
from ..money import MoneySerializer
from ..sport import SportSerializer
from ..court_schedule import CourtScheduleSerializer
from ..user import PublicOwnerListSerializer
from .base import CourtCenterSerializer


class CourtSummarySerializer(
    PrefetchedGalleryMixin,
    serializers.ModelSerializer,
):
    sport = SportSerializer(read_only=True)
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


class CourtPublicSummarySerializer(
    PrefetchedGalleryMixin,
    serializers.ModelSerializer,
):
    sport = SportSerializer(read_only=True)
    price_per_hour = serializers.SerializerMethodField()

    class Meta:
        model = Court
        fields = [
            "id",
            "sport",
            "title",
            "description",
            "images",
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


class CourtCenterDetailSerializer(CourtCenterSerializer):
    courts = CourtSummarySerializer(many=True, read_only=True)

    class Meta(CourtCenterSerializer.Meta):
        fields = [*CourtCenterSerializer.Meta.fields, "courts"]


class CourtCenterPublicDetailSerializer(CourtCenterSerializer):
    courts = CourtPublicSummarySerializer(many=True, read_only=True)

    class Meta(CourtCenterSerializer.Meta):
        fields = [*CourtCenterSerializer.Meta.fields, "courts"]


class CourtPublicListSerializer(serializers.ModelSerializer):
    # Swap to SportSerializer() if list should embed {id, name, ...}.
    sport = serializers.IntegerField(source="sport_id", read_only=True)

    class Meta:
        model = Court
        fields = ["id", "sport", "title"]
        read_only_fields = fields


class CourtCenterPublicListSerializer(
    PrefetchedCenterImagesMixin,
    serializers.ModelSerializer,
):
    owner = PublicOwnerListSerializer(read_only=True)
    courts = CourtPublicListSerializer(many=True, read_only=True)

    class Meta:
        model = CourtCenter
        fields = [
            "id",
            "owner",
            "title",
            "description",
            "latitude",
            "longitude",
            "logo",
            "images",
            "address",
            "courts",
            "status",
            "created_at",
            "updated_at",
            "review_count",
            "review_average_rating",
        ]
        read_only_fields = fields
