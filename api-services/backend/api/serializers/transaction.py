from rest_framework import serializers

from api.models import Booking, Transaction
from api.transaction_process.court_booking import TRANSACTION_STATES
from api.serializers import LineItemSerializer, MoneySerializer, PublicOwnerSerializer, SlotInputSerializer

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


class TransactionBookingSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "court",
            "status",
            "status_display",
            "date",
            "start_time",
            "end_time",
        ]
        read_only_fields = fields


class TransactionSerializer(serializers.ModelSerializer):
    customer = PublicOwnerSerializer(read_only=True)
    provider = PublicOwnerSerializer(read_only=True)
    bookings = TransactionBookingSerializer(many=True, read_only=True)
    line_items = LineItemSerializer(many=True, read_only=True)
    current_state_display = serializers.CharField(
        source="get_current_state_display",
        read_only=True,
    )
    pay_in_total = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "current_state",
            "current_state_display",
            "process_name",
            "customer",
            "provider",
            "line_items",
            "pay_in_total",
            "last_transition_at",
            "last_transition",
            "bookings",
            "created_at",
        ]
        read_only_fields = fields

    def get_pay_in_total(self, obj) -> dict:
        return MoneySerializer(
            {
                "amount": obj.pay_in_total_amount,
                "currency": obj.pay_in_total_currency,
            }
        ).data

class MyTransactionsInputSerializer(serializers.Serializer):
    state = serializers.ChoiceField(choices=TRANSACTION_STATES.choices, required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to"):
            if attrs["date_from"] > attrs["date_to"]:
                raise serializers.ValidationError({"date_from": "Date from must be before date to."})
        return attrs


class MyTransactionListSerializer(serializers.Serializer):
    transactions = TransactionSerializer(many=True)

    class Meta:
        model = Transaction
        fields = [
            *TransactionSerializer.Meta.fields,
        ]
        read_only_fields = fields