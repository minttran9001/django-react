from django.db.models import Prefetch

from api.models import Review, Transaction


def load_transaction_for_response(transaction_id: int) -> Transaction:
    # Review.court_center is a @property (not a relation), so it cannot be
    # prefetched as reviews__court_center — that path 500s once a review exists.
    reviews_qs = Review.objects.select_related(
        "reviewer__profile__avatar",
        "transaction__court__center",
    )
    return (
        Transaction.objects.select_related(
            "customer__profile__avatar",
            "provider__profile__avatar",
            "court",
        )
        .prefetch_related(
            "bookings",
            Prefetch("reviews", queryset=reviews_qs),
        )
        .get(pk=transaction_id)
    )
