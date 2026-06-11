from rest_framework import serializers

class MoneySerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=True)
    currency = serializers.CharField(max_length=3)

    def validate(self, attrs):
        amount = attrs.get("amount")
        currency = attrs.get("currency")
        if amount <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        if currency not in ["VND", "USD", "EUR"]:
            raise serializers.ValidationError("Invalid currency. Valid currencies are: VND, USD, EUR.")
        return attrs