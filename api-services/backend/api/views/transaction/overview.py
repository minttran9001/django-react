from django.db.models import Count
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Transaction
from api.serializers import (
    MyTransactionCountsResponseSerializer,
    TransactionSerializer,
)
from api.utils import (
    annotate_latest_end_at,
    apply_transaction_search_filters,
    parse_transaction_search_params,
)
from api.utils.transaction_search import LATEST_END_AT_ANNOTATION
from api.utils.typed_resource import RESOURCE_TRANSACTION, typed_resource
from api.views.transaction._helpers import transaction_queryset_for_serializer


class MyTransactionListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        qs = transaction_queryset_for_serializer().filter(customer=self.request.user)
        search_params = parse_transaction_search_params(self.request.query_params)
        qs = annotate_latest_end_at(qs)
        qs = apply_transaction_search_filters(qs, search_params)
        return qs.order_by(f"-{LATEST_END_AT_ANNOTATION}")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(typed_resource(RESOURCE_TRANSACTION, serializer.data))


class MyTransactionCountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search_params = parse_transaction_search_params(request.query_params)
        qs = Transaction.objects.filter(customer=request.user)
        qs = annotate_latest_end_at(qs)
        qs = apply_transaction_search_filters(qs, search_params)

        counts = {
            row["current_state"]: row["count"]
            for row in qs.values("current_state").annotate(count=Count("id"))
        }

        requested_states = search_params.get("states")
        if requested_states is not None:
            for state in requested_states:
                counts.setdefault(state, 0)

        return Response(
            MyTransactionCountsResponseSerializer({"states": counts}).data
        )
