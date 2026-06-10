from rest_framework import serializers

from api.models import Court, CourtCenter, Sport

from .court_schedule import CourtScheduleSerializer
from .image import ImageResourceSerializer
from .sport import SportSerializer
from ..utils.attach_images import (
    attach_center_images,
    attach_court_images,
    sync_center_images,
    sync_courts,
)
from ..utils.court_center_sync import sync_center_schedules


class CourtSummarySerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    images = ImageResourceSerializer(source="gallery", many=True, read_only=True)
    schedules = CourtScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = Court
        fields = [
            "id",
            "sport",
            "title",
            "description",
            "images",
            "schedules",
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
            "status",
            "created_at",
            "updated_at",
            "address",
        ]
        read_only_fields = ["id", "owner", "status", "created_at", "updated_at"]


class CourtCenterDetailSerializer(CourtCenterSerializer):
    courts = CourtSummarySerializer(many=True, read_only=True)

    class Meta(CourtCenterSerializer.Meta):
        fields = [*CourtCenterSerializer.Meta.fields, "courts"]


class CourtCenterDraftCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    logo_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    image_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )

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
        logo_id = validated_data.pop("logo_id", None)
        image_ids = validated_data.pop("image_ids", [])

        center = CourtCenter.objects.create(
            owner=request.user,
            status=CourtCenter.Status.DRAFT,
            **validated_data,
        )

        attach_center_images(
            center,
            request.user,
            logo_id=logo_id,
            image_ids=image_ids,
        )

        return center


class CourtCenterLocationSerializer(serializers.Serializer):
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
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

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


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


class CourtScheduleInputSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    day_of_week = serializers.IntegerField(min_value=0, max_value=6)
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

    def validate(self, attrs):
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time."}
            )
        return attrs


class CourtSchedulesInputSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    schedules = CourtScheduleInputSerializer(many=True)


class CourtCenterSchedulesSerializer(serializers.Serializer):
    courts = CourtSchedulesInputSerializer(many=True)

    def validate_courts(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one court.")
        return value

    def update(self, instance, validated_data):
        sync_center_schedules(instance, validated_data["courts"])
        return instance


class CourtCenterWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
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
    courts = CourtUpdateInputSerializer(many=True, required=False)

    def validate_courts(self, value):
        if value is not None and not value:
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
