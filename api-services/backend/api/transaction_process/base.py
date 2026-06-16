from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from django.db import transaction as db_transaction
from django.utils import timezone

from api.transaction_process.actions import run_action
from api.transaction_process.court_booking import (
    COURT_BOOKING_PROCESS,
    TRANSACTION_ACTORS,
    TRANSACTION_TRANSITIONS,
)

if TYPE_CHECKING:
    from api.models.transaction import Transaction


class TransitionError(Exception):
    pass


class UnknownProcessError(TransitionError):
    pass


class InvalidTransitionError(TransitionError):
    pass


class InvalidActorError(TransitionError):
    pass


PROCESS_REGISTRY: dict[str, dict] = {
    COURT_BOOKING_PROCESS["name"]: COURT_BOOKING_PROCESS,
}


class TransactionEngine:
    def __init__(self, transaction: Transaction, *, context: dict[str, Any] | None = None):
        self.transaction = transaction
        self.context: dict[str, Any] = dict(context or {})
        self.process = self._load_process()

    def _load_process(self) -> dict:
        process = PROCESS_REGISTRY.get(self.transaction.process_name)
        if process is None:
            raise UnknownProcessError(
                f"Unknown process: {self.transaction.process_name}"
            )
        return process

    @staticmethod
    def _normalize_name(value: str | TRANSACTION_TRANSITIONS | TRANSACTION_ACTORS) -> str:
        return str(value)

    def _get_transition_config(self, transition_name: str) -> dict:
        transitions = self.process["transitions"]
        config = transitions.get(transition_name)
        if config is None:
            config = transitions.get(self._normalize_name(transition_name))
        if config is None:
            raise InvalidTransitionError(f"Unknown transition: {transition_name}")
        return config

    def _allowed_actors(self, transition_config: dict) -> list[str]:
        actor = transition_config["actor"]
        if isinstance(actor, (list, tuple)):
            return [self._normalize_name(item) for item in actor]
        return [self._normalize_name(actor)]

    def can_transition(self, transition_name: str, *, actor: str) -> bool:
        try:
            self._validate_transition(transition_name, actor=actor)
        except TransitionError:
            return False
        return True

    def available_transitions(self, *, actor: str) -> list[str]:
        actor_name = self._normalize_name(actor)
        available: list[str] = []
        for transition_name, config in self.process["transitions"].items():
            if self.transaction.current_state != config["from"]:
                continue
            if actor_name not in self._allowed_actors(config):
                continue
            available.append(self._normalize_name(transition_name))
        return available

    def _validate_transition(self, transition_name: str, *, actor: str) -> dict:
        config = self._get_transition_config(transition_name)
        actor_name = self._normalize_name(actor)

        if self.transaction.current_state != config["from"]:
            raise InvalidTransitionError(
                f"Transition '{transition_name}' requires state "
                f"{config['from']}, current state is {self.transaction.current_state}."
            )

        if actor_name not in self._allowed_actors(config):
            raise InvalidActorError(
                f"Actor '{actor_name}' cannot perform transition '{transition_name}'."
            )

        return config

    def _ensure_persisted(self) -> None:
        if self.transaction.pk is not None:
            return

        if self.transaction.pay_in_total_amount is None:
            self.transaction.pay_in_total_amount = Decimal("0")
        if self.transaction.pay_out_total_amount is None:
            self.transaction.pay_out_total_amount = Decimal("0")
        if not self.transaction.pay_in_total_currency:
            self.transaction.pay_in_total_currency = self.transaction.court.price_currency
        if not self.transaction.pay_out_total_currency:
            self.transaction.pay_out_total_currency = self.transaction.court.price_currency

        self.transaction.save()

    def transition(
        self,
        transition_name: str,
        *,
        actor: str | TRANSACTION_ACTORS,
        context: dict[str, Any] | None = None,
    ) -> Transaction:
        transition_key = self._normalize_name(transition_name)
        config = self._validate_transition(transition_key, actor=self._normalize_name(actor))

        if context:
            self.context.update(context)

        with db_transaction.atomic():
            self._ensure_persisted()
            for action in config["actions"]:
                run_action(self._normalize_name(action), self.transaction, self.context)

            self.transaction.current_state = config["to"]
            self.transaction.last_transition = transition_key
            self.transaction.last_transition_at = timezone.now()
            self.transaction.save(
                update_fields=[
                    "current_state",
                    "last_transition",
                    "last_transition_at",
                    "updated_at",
                ]
            )

        self.transaction.refresh_from_db()
        return self.transaction

    def is_duration_transition_due(self, transition_name: str) -> bool:
        config = self._get_transition_config(transition_name)
        trigger = config.get("trigger")
        if not trigger or trigger.get("type") != "duration":
            return False

        if self.transaction.current_state != config["from"]:
            return False

        if self.transaction.current_state != trigger.get("from_state"):
            return False

        elapsed = timezone.now() - self.transaction.last_transition_at
        return elapsed.total_seconds() >= trigger["after_seconds"]

    def is_datetime_transition_due(self, transition_name: str) -> bool:
        config = self._get_transition_config(transition_name)
        trigger = config.get("trigger")
        if not trigger or trigger.get("type") != "datetime":
            return False

        if self.transaction.current_state != config["from"]:
            return False

        target_at = self._resolve_trigger_datetime(trigger["source"])
        if target_at is None:
            return False

        target_at = timezone.make_aware(target_at) if timezone.is_naive(target_at) else target_at
        return timezone.now() >= target_at

    def _resolve_trigger_datetime(self, source: str) -> datetime | None:
        if source == "bookings.latest_end_at":
            return self.transaction.latest_end_at
        raise TransitionError(f"Unknown trigger source: {source}")

    def run_due_system_transitions(self) -> Transaction | None:
        for transition_name, config in self.process["transitions"].items():
            if TRANSACTION_ACTORS.SYSTEM not in self._allowed_actors(config):
                continue

            transition_key = self._normalize_name(transition_name)
            trigger = config.get("trigger")
            if trigger is None:
                continue

            is_due = (
                self.is_duration_transition_due(transition_key)
                if trigger["type"] == "duration"
                else self.is_datetime_transition_due(transition_key)
                if trigger["type"] == "datetime"
                else False
            )
            if is_due:
                return self.transition(transition_key, actor=TRANSACTION_ACTORS.SYSTEM)

        return None
