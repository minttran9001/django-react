from rest_framework import serializers

from api.models import CourtCenter

from ...utils.attach_images import attach_center_images, sync_center_images, sync_courts

from .courts import CourtUpdateInputSerializer


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


class CourtCenterArchiveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=CourtCenter.Status.choices)

    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        instance.save(update_fields=["status", "updated_at"])
        return instance
