from rest_framework import serializers

from api.models import Court, CourtCenter, Sport

from .image import ImageResourceSerializer
from .sport import SportSerializer
from ..utils.attach_images import (
    attach_center_images,
    attach_court_images,
    sync_center_images,
    sync_courts,
)

class CourtSummarySerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    images = ImageResourceSerializer(source="gallery", many=True, read_only=True)

    class Meta:
        model = Court
        fields = [
            "id",
            "sport",
            "title",
            "description",
            "images",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


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


class CourtUpdateInputSerializer(CourtCreateInputSerializer):
    id = serializers.IntegerField(required=False)


class CourtCenterSerializer(serializers.ModelSerializer):
    logo = ImageResourceSerializer(read_only=True)
    images = ImageResourceSerializer(source="gallery", many=True, read_only=True)

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
            "created_at",
            "updated_at",
            "address",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]


class CourtCenterDetailSerializer(CourtCenterSerializer):
    courts = CourtSummarySerializer(many=True, read_only=True)

    class Meta(CourtCenterSerializer.Meta):
        fields = [*CourtCenterSerializer.Meta.fields, "courts"]


class CourtCenterWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True,
    )
    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True,
    )
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    logo_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    image_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )
    courts = CourtUpdateInputSerializer(many=True)

    def validate_courts(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one court.")
        return value

    def validate(self, attrs):
        logo_id = attrs.get("logo_id")
        image_ids = attrs.get("image_ids") or []

        if logo_id and logo_id in image_ids:
            raise serializers.ValidationError(
                {"logo_id": "Logo image cannot also be included in image_ids."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        courts_data = validated_data.pop("courts")
        logo_id = validated_data.pop("logo_id", None)
        image_ids = validated_data.pop("image_ids", [])

        center = CourtCenter.objects.create(
            owner=request.user,
            **validated_data,
        )

        attach_center_images(
            center,
            request.user,
            logo_id=logo_id,
            image_ids=image_ids,
        )

        for court_data in courts_data:
            court_image_ids = court_data.pop("image_ids", [])
            court = Court.objects.create(center=center, **court_data)
            attach_court_images(court, request.user, image_ids=court_image_ids)

        return center
    
    def update(self, instance, validated_data):
        request = self.context["request"]
        courts_data = validated_data.pop("courts", None)
        logo_id = validated_data.pop("logo_id", serializers.empty)
        image_ids = validated_data.pop("image_ids", serializers.empty)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if logo_id is not serializers.empty or image_ids is not serializers.empty:
            sync_center_images(
                instance,
                request.user,
                logo_id=logo_id if logo_id is not serializers.empty else None,
                image_ids=image_ids if image_ids is not serializers.empty else None,
            )
        if courts_data is not None:
            sync_courts(instance, courts_data, request.user)
        return instance

