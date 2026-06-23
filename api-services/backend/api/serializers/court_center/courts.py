from rest_framework import serializers

from api.models import Sport

from ..money import MoneySerializer
from ...utils.attach_images import sync_courts


class CourtCreateInputSerializer(serializers.Serializer):
    sport_id = serializers.PrimaryKeyRelatedField(
        queryset=Sport.objects.all(),
        source="sport",
    )
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    image_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )
    price_per_hour = MoneySerializer(required=False)

    def validate(self, attrs):
        price = attrs.pop("price_per_hour", None)
        if price:
            attrs["price_per_hour"] = price["amount"]
            attrs["price_currency"] = price["currency"]
        return attrs


class CourtUpdateInputSerializer(CourtCreateInputSerializer):
    id = serializers.IntegerField(required=False)


class CourtCenterCourtsSerializer(serializers.Serializer):
    courts = CourtUpdateInputSerializer(many=True)

    def validate_courts(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one court.")
        return value

    def update(self, instance, validated_data):
        request = self.context["request"]
        sync_courts(instance, validated_data["courts"], request.user)
        return instance
