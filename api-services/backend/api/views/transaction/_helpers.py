from api.models import Transaction


def transaction_queryset_for_serializer():
    return (
        Transaction.objects.select_related(
            "customer__profile__avatar",
            "provider__profile__avatar",
            "court__sport",
            "court__center",
        )
        .prefetch_related(
            "bookings",
            "court__images",
            "court__center__images",
            "reviews__reviewer__profile__avatar",
        )
    )


def load_transaction_for_response(transaction_id: int) -> Transaction:
    return transaction_queryset_for_serializer().get(pk=transaction_id)
