from rest_framework import serializers

from api.models import Booking, Transaction

from ..line_items import LineItemSerializer
from ..money import MoneySerializer
from ..review import ReviewSerializer
from ..user import PublicOwnerSerializer


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
    review = serializers.SerializerMethodField()

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
            "review",
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

    def get_review(self, obj) -> dict | None:
        reviews = obj.reviews.all()
        first = reviews[0] if reviews else None
        if first is None:
            return None
        return ReviewSerializer(first).data


class MyTransactionListSerializer(serializers.Serializer):
    transactions = TransactionSerializer(many=True)

    class Meta:
        model = Transaction
        fields = [
            *TransactionSerializer.Meta.fields,
        ]
        read_only_fields = fields
