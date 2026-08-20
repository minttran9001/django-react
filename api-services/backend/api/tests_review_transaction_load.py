from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from api.models import Court, CourtCenter, Review, Sport, Transaction
from api.serializers import TransactionSerializer
from api.transaction_process.court_booking import TRANSACTION_STATES
from api.views.transaction._helpers import load_transaction_for_response


class ReviewedTransactionLoadTests(TestCase):
    """GET/serialize paths must not 500 after a review is created."""

    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@example.com", "pass")
        self.customer = User.objects.create_user(
            "customer", "customer@example.com", "pass"
        )
        self.sport = Sport.objects.create(name="Tennis", code="tennis")
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Center",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.court = Court.objects.create(
            sport=self.sport,
            center=self.center,
            title="Court 1",
            price_per_hour=Decimal("100000"),
            price_currency="VND",
        )
        self.transaction = Transaction.objects.create(
            customer=self.customer,
            provider=self.owner,
            court=self.court,
            current_state=TRANSACTION_STATES.COMPLETED,
            pay_in_total_amount=Decimal("100000"),
            pay_in_total_currency="VND",
            pay_out_total_amount=Decimal("90000"),
            pay_out_total_currency="VND",
        )

    def test_load_transaction_for_response_after_review(self):
        Review.objects.create(
            transaction=self.transaction,
            reviewer=self.customer,
            rating=5,
            comment="Great court",
        )

        loaded = load_transaction_for_response(self.transaction.pk)
        data = TransactionSerializer(loaded).data

        self.assertIsNotNone(data["review"])
        self.assertEqual(data["review"]["rating"], 5)
        self.assertEqual(data["review"]["court_center"]["id"], self.center.id)
        self.assertEqual(data["review"]["court_center"]["title"], "Center")

    def test_review_court_center_property_resolves_via_court(self):
        review = Review.objects.create(
            transaction=self.transaction,
            reviewer=self.customer,
            rating=4,
            comment="Good",
        )
        self.assertEqual(review.court_center, self.center)
