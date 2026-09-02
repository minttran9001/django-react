from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Court, CourtCenter, Transaction
from api.serializers import (
    InitiateTransactionSerializer,
    RequestReviewSerializer,
    TransactionSerializer,
)
from api.transaction_process.actions import ActionError
from api.transaction_process.base import TransactionEngine, TransitionError
from api.transaction_process.court_booking import (
    TRANSACTION_ACTORS,
    TRANSACTION_STATES,
    TRANSACTION_TRANSITIONS,
)
from api.utils.app_timezone import timezone_from_query_params
from api.utils.exceptions import error_response, validation_error_response

from ._helpers import load_transaction_for_response


class InitiateTransactionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InitiateTransactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        court = get_object_or_404(
            Court.objects.select_related("center").prefetch_related("schedules"),
            pk=data["court_id"],
            center__status=CourtCenter.Status.PUBLISHED,
        )

        if court.center.owner_id == request.user.id:
            return validation_error_response(
                {"court_id": ["You cannot book your own venue."]}
            )

        transaction = Transaction(
            customer=request.user,
            provider=court.center.owner,
            court=court,
            current_state=TRANSACTION_STATES.INITIAL,
            pay_in_total_amount=Decimal("0"),
            pay_in_total_currency=court.price_currency,
            pay_out_total_amount=Decimal("0"),
            pay_out_total_currency=court.price_currency,
        )

        engine = TransactionEngine(
            transaction,
            context={
                "slots": data["slots"],
                "timezone": timezone_from_query_params(request.query_params),
            },
        )

        try:
            transaction = engine.transition(
                TRANSACTION_TRANSITIONS.INITIATE,
                actor=TRANSACTION_ACTORS.CUSTOMER,
            )
        except ValidationError as exc:
            return validation_error_response(exc.detail)
        except ActionError as exc:
            return validation_error_response({"detail": [str(exc)]})
        except TransitionError as exc:
            return validation_error_response({"detail": [str(exc)]})

        transaction = load_transaction_for_response(transaction.pk)
        return Response(
            TransactionSerializer(transaction).data,
            status=status.HTTP_201_CREATED,
        )


class TransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        transaction = get_object_or_404(
            Transaction.objects.select_related(
                "customer__profile__avatar",
                "provider__profile__avatar",
                "court",
            ).prefetch_related("bookings"),
            pk=pk,
            customer=request.user,
        )
        return Response(TransactionSerializer(transaction).data)


class ConfirmPaymentView(APIView):
    """
    Customer self-service confirm is disabled until a real PSP webhook exists.

    Previously this view authenticated as the customer, then ran CONFIRM_PAYMENT
    as TRANSACTION_ACTORS.SYSTEM while capture_payment was a no-op — any
    authenticated customer could lock slots as CONFIRMED without paying.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        # Ensure the transaction exists and belongs to the caller (same 404
        # surface as before) before refusing confirmation.
        get_object_or_404(
            Transaction.objects.select_related("court"),
            pk=pk,
            customer=request.user,
        )
        return error_response(
            "Payment confirmation is not available until a payment provider "
            "webhook verifies capture. Your booking stays pending and will "
            "expire if unpaid.",
            code="payment_provider_not_configured",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class RequestReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        serializer = RequestReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        transaction = get_object_or_404(
            Transaction.objects.select_related("court"),
            pk=pk,
            customer=request.user,
        )
        engine = TransactionEngine(
            transaction,
            context={"rating": data["rating"], "comment": data["comment"]},
        )
        try:
            transaction = engine.transition(
                TRANSACTION_TRANSITIONS.REVIEW,
                actor=TRANSACTION_ACTORS.CUSTOMER,
            )
        except ActionError as exc:
            return validation_error_response({"detail": [str(exc)]})
        except TransitionError as exc:
            return validation_error_response({"detail": [str(exc)]})
        return Response(
            TransactionSerializer(transaction).data,
            status=status.HTTP_200_OK,
        )
