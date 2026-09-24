from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate

from api.models import Court, CourtCenter, Sport
from api.serializers.court_center.courts import CourtUpdateInputSerializer
from api.utils.attach_images import sync_courts
from api.views.line_items import SpeculateLineItemListViewForCustomer
from api.views.transaction.customer import InitiateTransactionView


class ZeroPriceCourtCreateTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@test.com", "pass")
        self.customer = User.objects.create_user(
            "customer", "customer@test.com", "pass"
        )
        self.sport = Sport.objects.create(name="Tennis", code="tennis")
        self.center = CourtCenter.objects.create(
            owner=self.owner,
            title="Center",
            status=CourtCenter.Status.PUBLISHED,
        )
        self.factory = APIRequestFactory()

    def test_create_court_without_price_is_rejected_by_serializer(self):
        serializer = CourtUpdateInputSerializer(
            data={
                "sport_id": self.sport.id,
                "title": "Free Court",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("price_per_hour", serializer.errors)

    def test_create_court_without_price_via_sync_is_rejected(self):
        with self.assertRaises(ValidationError):
            sync_courts(
                self.center,
                [
                    {
                        "sport": self.sport,
                        "title": "Free Court",
                    }
                ],
                self.owner,
            )
        self.assertFalse(
            Court.objects.filter(center=self.center, title="Free Court").exists()
        )

    def test_update_existing_court_may_omit_price(self):
        court = Court.objects.create(
            center=self.center,
            sport=self.sport,
            title="Court A",
            price_per_hour=Decimal("25.00"),
            price_currency="USD",
        )
        serializer = CourtUpdateInputSerializer(
            data={
                "id": court.id,
                "sport_id": self.sport.id,
                "title": "Court A Renamed",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("price_per_hour", serializer.validated_data)

    def test_initiate_rejects_zero_price_court(self):
        court = Court.objects.create(
            center=self.center,
            sport=self.sport,
            title="Zero Court",
            price_per_hour=Decimal("0.00"),
            price_currency="USD",
        )
        request = self.factory.post(
            "/api/transactions/initiate",
            {
                "court_id": court.id,
                "slots": [
                    {
                        "date": "2099-01-15",
                        "start": "10:00",
                        "end": "11:00",
                    }
                ],
            },
            format="json",
        )
        force_authenticate(request, user=self.customer)
        response = InitiateTransactionView.as_view()(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn("court_id", response.data.get("errors", {}))

    def test_speculate_rejects_zero_price_court(self):
        court = Court.objects.create(
            center=self.center,
            sport=self.sport,
            title="Zero Court",
            price_per_hour=Decimal("0.00"),
            price_currency="USD",
        )
        request = self.factory.post(
            "/api/line-items/customer",
            {
                "court_id": court.id,
                "slots": [
                    {
                        "date": "2099-01-15",
                        "start": "10:00",
                        "end": "11:00",
                    }
                ],
            },
            format="json",
        )
        response = SpeculateLineItemListViewForCustomer.as_view()(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn("court_id", response.data.get("errors", {}))
