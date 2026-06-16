from datetime import date

from django.db import connection
from django.db.models import OuterRef, QuerySet, Subquery
from django.db.models.expressions import RawSQL
from rest_framework.exceptions import ValidationError

from api.models import Booking, Transaction


def _latest_end_at_subquery():
    if connection.vendor == "postgresql":
        end_at_sql = RawSQL("(date + end_time)::timestamp", [])
    else:
        end_at_sql = RawSQL("datetime(date, end_time)", [])

    return (
        Booking.objects.filter(transaction_id=OuterRef("pk"))
        .annotate(end_at=end_at_sql)
        .order_by("-end_at")
        .values("end_at")[:1]
    )


LATEST_END_AT_ANNOTATION = "_latest_booking_end_at"


def annotate_latest_end_at(qs: QuerySet[Transaction]) -> QuerySet[Transaction]:
    return qs.annotate(**{LATEST_END_AT_ANNOTATION: Subquery(_latest_end_at_subquery())})


def apply_transaction_search_filters(qs: QuerySet[Transaction], search_params: dict) -> QuerySet[Transaction]:
    if search_params.get("states") is not None:
        qs = qs.filter(current_state__in=search_params["states"])
    if search_params.get("date_from"):
        qs = qs.filter(**{f"{LATEST_END_AT_ANNOTATION}__date__gte": search_params["date_from"]})
    if search_params.get("date_to"):
        qs = qs.filter(**{f"{LATEST_END_AT_ANNOTATION}__date__lte": search_params["date_to"]})
    return qs

def parse_transaction_search_params(query_params) -> dict:
    """Read and validate ?state=&date_from=&date_to="""
    params = {}
    states = query_params.get("states")
    if states is not None and states != "":
        try:
            states_int = [int(state) for state in states.split(",")]
        except (TypeError, ValueError) as exc:
            raise ValidationError({"states": "Invalid states."}) from exc
        if any(state_int not in Transaction.States.values for state_int in states_int):
            raise ValidationError({"states": "Invalid states."})
        params["states"] = states_int
            
    if "date_from" in query_params:
        try:
            params["date_from"] = date.fromisoformat(query_params["date_from"])
        except ValueError as exc:
            raise ValidationError({"date_from": "Invalid date from."}) from exc
    if "date_to" in query_params:
        try:
            params["date_to"] = date.fromisoformat(query_params["date_to"])
        except ValueError as exc:
            raise ValidationError({"date_to": "Invalid date to."}) from exc
    return params