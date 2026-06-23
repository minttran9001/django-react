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
from api.utils.exceptions import validation_error_response

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
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        transaction = get_object_or_404(
            Transaction.objects.select_related("court"),
            pk=pk,
            customer=request.user,
        )

        engine = TransactionEngine(transaction)

        try:
            transaction = engine.transition(
                TRANSACTION_TRANSITIONS.CONFIRM_PAYMENT,
                actor=TRANSACTION_ACTORS.SYSTEM,
            )
        except ActionError as exc:
            return validation_error_response({"detail": [str(exc)]})
        except TransitionError as exc:
            return validation_error_response({"detail": [str(exc)]})

        transaction = load_transaction_for_response(transaction.pk)
        return Response(TransactionSerializer(transaction).data)


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
