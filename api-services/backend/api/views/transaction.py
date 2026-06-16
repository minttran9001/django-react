from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Court, CourtCenter, Transaction
from api.serializers.transaction import InitiateTransactionSerializer, TransactionSerializer
from api.transaction_process.actions import ActionError
from api.transaction_process.base import TransactionEngine, TransitionError
from api.transaction_process.court_booking import (
    TRANSACTION_ACTORS,
    TRANSACTION_STATES,
    TRANSACTION_TRANSITIONS,
)
from api.utils.exceptions import validation_error_response
from api.utils import (
    annotate_latest_end_at,
    apply_transaction_search_filters,
    parse_transaction_search_params,
)
from api.utils.transaction_search import LATEST_END_AT_ANNOTATION


def _load_transaction_for_response(transaction_id: int) -> Transaction:
    return (
        Transaction.objects.select_related(
            "customer__profile__avatar",
            "provider__profile__avatar",
            "court",
        )
        .prefetch_related("bookings")
        .get(pk=transaction_id)
    )


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

        engine = TransactionEngine(transaction, context={"slots": data["slots"]})

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

        transaction = _load_transaction_for_response(transaction.pk)
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

        transaction = _load_transaction_for_response(transaction.pk)
        return Response(TransactionSerializer(transaction).data)

class MyTransactionListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        qs = Transaction.objects.filter(customer=self.request.user)
        qs = qs.select_related(
            "customer__profile__avatar",
            "provider__profile__avatar",
            "court",
        ).prefetch_related("bookings")
        search_params = parse_transaction_search_params(self.request.query_params)
        qs = annotate_latest_end_at(qs)
        qs = apply_transaction_search_filters(qs, search_params)
        return qs.order_by(f"-{LATEST_END_AT_ANNOTATION}")