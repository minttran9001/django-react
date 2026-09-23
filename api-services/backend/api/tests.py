from datetime import date, time
from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from api.transaction_process.actions import _compute_pay_out
from api.utils.booking_pricing import (
    CUSTOMER_PLATFORM_FEE_RATE,
    PROVIDER_PLATFORM_FEE_RATE,
    VAT_RATE,
    build_line_items,
)


def _court(*, price_per_hour=Decimal("100.00"), currency="USD"):
    return SimpleNamespace(
        id=1,
        title="Court A",
        price_per_hour=price_per_hour,
        price_currency=currency,
    )


def _one_hour_slot():
    return [{"date": date(2026, 9, 23), "start": time(10, 0), "end": time(11, 0)}]


class ProviderPlatformFeeBaseTests(SimpleTestCase):
    def test_provider_fee_is_based_on_slot_subtotal_not_pay_in(self):
        """
        Snapshot path includes customer VAT + platform fee in pay_in.
        Provider fee must still be rate * booking_slot subtotal only; otherwise
        every payout underpays the provider by charging commission on money
        they never receive.
        """
        quote = build_line_items(
            _court(),
            _one_hour_slot(),
            include_for=["customer", "provider"],
        )

        slot_total = Decimal("100.00")
        vat_total = slot_total * VAT_RATE
        customer_fee = (slot_total + vat_total) * CUSTOMER_PLATFORM_FEE_RATE
        expected_pay_in = slot_total + vat_total + customer_fee
        expected_provider_fee = slot_total * PROVIDER_PLATFORM_FEE_RATE

        provider_fee_item = next(
            item for item in quote["line_items"] if item["type"] == "provider_platform_fee"
        )

        self.assertEqual(quote["pay_in_total"]["amount"], expected_pay_in)
        self.assertEqual(
            Decimal(str(provider_fee_item["line_total"]["amount"])),
            expected_provider_fee,
        )

        # Regression: old code used inflated pay_in (115.50) * 5% = 5.775
        inflated_fee = expected_pay_in * PROVIDER_PLATFORM_FEE_RATE
        self.assertNotEqual(
            Decimal(str(provider_fee_item["line_total"]["amount"])),
            inflated_fee,
        )

        pay_out = _compute_pay_out(quote["line_items"], "USD")
        self.assertEqual(pay_out["amount"], slot_total - expected_provider_fee)

    def test_provider_only_quote_still_fees_slot_subtotal(self):
        quote = build_line_items(
            _court(),
            _one_hour_slot(),
            include_for=["provider"],
        )
        provider_fee_item = next(
            item for item in quote["line_items"] if item["type"] == "provider_platform_fee"
        )
        self.assertEqual(
            Decimal(str(provider_fee_item["line_total"]["amount"])),
            Decimal("5.00"),
        )
