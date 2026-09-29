from rest_framework import serializers

from ..line_items import SlotInputSerializer


class CourtTimeslotsSerializer(serializers.Serializer):
    court = serializers.IntegerField()
    slots = SlotInputSerializer(many=True, read_only=True)


class CourtCenterTimeslotsSerializer(serializers.Serializer):
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    courts = CourtTimeslotsSerializer(many=True, read_only=True)
