from rest_framework.generics import get_object_or_404
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from api.serializers.line_items import LineItemQuoteRequestSerializer, LineItemSerializer
from api.utils.booking_pricing import build_line_items
from api.models import Court, CourtCenter
from api.utils.booking_slots import validate_slots_are_available_for_court
from api.serializers.money import MoneySerializer

#speculated transaction line-items for frontend (should be able to show the total price of the transaction)
class SpeculateLineItemListViewForCustomer(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        input_serializer = LineItemQuoteRequestSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        court_id = input_serializer.validated_data["court_id"]
        slots = input_serializer.validated_data["slots"]

        court = get_object_or_404(
            Court.objects.select_related("center").prefetch_related("schedules"),
            pk=court_id,
            center__status=CourtCenter.Status.PUBLISHED,
        )

        validate_slots_are_available_for_court(slots, court)

        line_items_data = build_line_items(court, slots, include_for=["customer"])
        line_items = line_items_data["line_items"]
        pay_in_total = line_items_data["pay_in_total"]

        return Response({
            "line_items": LineItemSerializer(line_items, many=True).data,
            "pay_in_total": MoneySerializer(pay_in_total).data,
        }, status=status.HTTP_200_OK)