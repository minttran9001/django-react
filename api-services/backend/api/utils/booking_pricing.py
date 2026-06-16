from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from api.models import Court
from api.serializers.line_items import SlotInputSerializer
from api.serializers.money import MoneySerializer

SLOT_DURATION_MINUTES = 60
VAT_RATE = Decimal("0.1")
CUSTOMER_PLATFORM_FEE_RATE = Decimal("0.05")
PROVIDER_PLATFORM_FEE_RATE = Decimal("0.05")


def slots_are_adjacent(end_a, start_b, tolerance_minutes: int = 0) -> bool:
    gap = (
        datetime.combine(date.min, start_b) - datetime.combine(date.min, end_a)
    ).total_seconds() / 60
    return 0 <= gap <= tolerance_minutes

def merge_adjacent_slots(
    slots: list[SlotInputSerializer],
    tolerance_minutes: int = 0,
) -> list[SlotInputSerializer]:
    if not slots:
        return []
    merged: list[SlotInputSerializer] = []
    for slot_date in sorted({s["date"] for s in slots}):
        day_slots = sorted(
            (s for s in slots if s["date"] == slot_date),
            key=lambda s: s["start"],
        )
        current = dict(day_slots[0])
        for next_slot in day_slots[1:]:
            if slots_are_adjacent(current["end"], next_slot["start"], tolerance_minutes):
                current["end"] = max(current["end"], next_slot["end"])
            else:
                merged.append(current)
                current = dict(next_slot)
        merged.append(current)
    return merged


def slot_duration_hours(start: datetime.time, end: datetime.time) -> Decimal:
    delta = (datetime.combine(date.min,end) - datetime.combine(date.min,start))
    return Decimal(delta.total_seconds()) / Decimal(3600)

def build_line_items(
    court: Court,
    slots: list[SlotInputSerializer],
    include_for: Optional[list[str]] = None,
) -> list[dict]:
    include_for = include_for or ["customer", "provider"]
    currency = court.price_currency
    line_items = []
    pay_in_total = Decimal("0")
    merged_slots = merge_adjacent_slots(slots)

    for slot in merged_slots:
        hours = slot_duration_hours(slot['start'], slot['end'])
        date = slot['date']
        unit_price = court.price_per_hour
        total = unit_price * hours

        line_item = {
            "type": "booking_slot",
            "label": f"{slot['start'].strftime('%H:%M')}-{slot['end'].strftime('%H:%M')} on {date.strftime('%Y-%m-%d')}",
            "code": f"line-item/{court.id}/{date.strftime('%Y-%m-%d')}/{slot['start'].strftime('%H:%M')}-{slot['end'].strftime('%H:%M')}",
            "quantity": float(hours),
            "unit_price": MoneySerializer({"amount": unit_price, "currency": currency}).data,
            "line_total": MoneySerializer({"amount": total, "currency": currency}).data,
            "include_for": ["customer", "provider"],
            "metadata": {
                "court_id": court.id,
                "date": date.strftime('%Y-%m-%d'),
                "start": slot['start'].strftime('%H:%M'),
                "end": slot['end'].strftime('%H:%M'),
            }
        }
        line_items.append(line_item)
        pay_in_total += total


    if VAT_RATE > 0 and "customer" in include_for:
        vat_total = pay_in_total * VAT_RATE
        line_items.append({
            "type": "vat",
            "code": "line-item/vat",
            "label": "VAT",
            "quantity": 1,
            "unit_price": MoneySerializer({"amount": vat_total, "currency": currency}).data,
            "line_total": MoneySerializer({"amount": vat_total, "currency": currency}).data,
            "include_for": ["customer", "provider"],
        })
        pay_in_total += vat_total

    if CUSTOMER_PLATFORM_FEE_RATE > 0 and "customer" in include_for:
        customer_platform_fee_total = pay_in_total * CUSTOMER_PLATFORM_FEE_RATE
        line_items.append({
            "type": "customer_platform_fee",
            "code": "line-item/customer-platform-fee",
            "label": "Customer Platform Fee",
            "quantity": 1,
            "unit_price": MoneySerializer({"amount": customer_platform_fee_total, "currency": currency}).data,
            "line_total": MoneySerializer({"amount": customer_platform_fee_total, "currency": currency}).data,
            "include_for": ["customer"],
        })
        pay_in_total += customer_platform_fee_total

    if PROVIDER_PLATFORM_FEE_RATE > 0 and "provider" in include_for:
        provider_platform_fee_total = pay_in_total * PROVIDER_PLATFORM_FEE_RATE
        line_items.append({
            "type": "provider_platform_fee",
            "code": "line-item/provider-platform-fee",
            "label": "Provider Platform Fee",
            "quantity": 1,
            "unit_price": MoneySerializer({"amount": provider_platform_fee_total, "currency": currency}).data,
            "line_total": MoneySerializer({"amount": provider_platform_fee_total, "currency": currency}).data,
            "include_for": ["provider"],
        })

    return {
        "line_items": line_items,
        "pay_in_total": {
            "amount": pay_in_total,
            "currency": currency,
        },
    }