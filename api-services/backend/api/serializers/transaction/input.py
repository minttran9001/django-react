from rest_framework import serializers

from api.transaction_process.court_booking import TRANSACTION_STATES

from ..line_items import SlotInputSerializer


class InitiateTransactionSerializer(serializers.Serializer):
    court_id = serializers.IntegerField()
    slots = SlotInputSerializer(many=True, min_length=1)

    def validate(self, attrs):
        slots = attrs["slots"]
        seen = set()
        for slot in slots:
            key = (slot["date"], slot["start"], slot["end"])
            if key in seen:
                raise serializers.ValidationError({"slots": "Duplicate slot."})
            seen.add(key)
        return attrs


class MyTransactionsInputSerializer(serializers.Serializer):
    state = serializers.ChoiceField(choices=TRANSACTION_STATES.choices, required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to"):
            if attrs["date_from"] > attrs["date_to"]:
                raise serializers.ValidationError(
                    {"date_from": "Date from must be before date to."}
                )
        return attrs


class MyTransactionCountsResponseSerializer(serializers.Serializer):
    states = serializers.DictField(child=serializers.IntegerField())
