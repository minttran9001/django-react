from rest_framework import serializers

from ...utils.court_center_sync import sync_center_schedules


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
