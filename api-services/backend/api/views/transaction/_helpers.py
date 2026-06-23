from api.models import Transaction


def load_transaction_for_response(transaction_id: int) -> Transaction:
    return (
        Transaction.objects.select_related(
            "customer__profile__avatar",
            "provider__profile__avatar",
            "court",
        )
        .prefetch_related(
            "bookings",
            "reviews__reviewer__profile__avatar",
            "reviews__court_center",
        )
        .get(pk=transaction_id)
    )
