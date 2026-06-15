from rest_framework import serializers

from api.serializers.money import MoneySerializer


class SlotInputSerializer(serializers.Serializer):
    start = serializers.TimeField()
    end = serializers.TimeField()
    date = serializers.DateField()

    def validate(self, attrs):
        if attrs["end"] <= attrs["start"]:
            raise serializers.ValidationError({"end": "End must be after start."})
        return attrs


class LineItemQuoteRequestSerializer(serializers.Serializer):
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


class LineItemSerializer(serializers.Serializer):
    type = serializers.CharField()
    code = serializers.CharField()
    quantity = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=False,
    )
    unit_price = MoneySerializer()
    line_total = MoneySerializer()
    include_for = serializers.ListField(child=serializers.CharField())
    metadata = serializers.DictField(required=False)
    label = serializers.CharField()

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        quantity = rep.get("quantity")
        if quantity is not None:
            rep["quantity"] = float(quantity)
        return rep
