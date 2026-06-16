from datetime import date, datetime

from rest_framework import serializers


class ApiDateField(serializers.DateField):
    """Accepts YYYY-MM-DD, ISO datetime strings (e.g. from JS Date.toJSON()), and date objects."""

    default_error_messages = {
        "invalid": "Enter a valid date.",
    }

    def to_internal_value(self, value):
        if value in (None, ""):
            return None

        if isinstance(value, datetime):
            return value.date()

        if isinstance(value, date):
            return value

        if isinstance(value, str):
            stripped = value.strip()
            if "T" in stripped or stripped.endswith("Z"):
                normalized = stripped.replace("Z", "+00:00")
                try:
                    return datetime.fromisoformat(normalized).date()
                except ValueError as exc:
                    raise serializers.ValidationError(self.error_messages["invalid"]) from exc

        return super().to_internal_value(value)
