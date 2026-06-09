from rest_framework import serializers

from api.models import Court, CourtCenter, Sport

from .image import ImageSerializer
from .sport import SportSerializer


class CourtSummarySerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    gallery = ImageSerializer(many=True, read_only=True)

    class Meta:
        model = Court
        fields = [
            "id",
            "sport",
            "title",
            "description",
            "gallery",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class CourtCreateInputSerializer(serializers.ModelSerializer):
    sport_id = serializers.PrimaryKeyRelatedField(
        queryset=Sport.objects.all(),
        source="sport",
    )

    class Meta:
        model = Court
        fields = ["sport_id", "title", "description"]


class CourtCenterSerializer(serializers.ModelSerializer):
    logo = ImageSerializer(read_only=True)
    gallery = ImageSerializer(many=True, read_only=True)

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
            "gallery",
            "created_at",
            "updated_at",
            "address"
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]


class CourtCenterDetailSerializer(CourtCenterSerializer):
    courts = CourtSummarySerializer(many=True, read_only=True)

    class Meta(CourtCenterSerializer.Meta):
        fields = [*CourtCenterSerializer.Meta.fields, "courts"]


class CourtCenterCreateSerializer(serializers.ModelSerializer):
    courts = CourtCreateInputSerializer(many=True)

    class Meta:
        model = CourtCenter
        fields = ["title", "description", "latitude", "longitude", "address", "courts"]

    def validate_courts(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one court.")
        return value

    def create(self, validated_data):
        courts_data = validated_data.pop("courts")
        center = CourtCenter.objects.create(
            owner=self.context["request"].user,
            **validated_data,
        )
        for court_data in courts_data:
            Court.objects.create(center=center, **court_data)
        return center
