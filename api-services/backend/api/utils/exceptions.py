from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_error(
    message: str,
    *,
    code: str | None = None,
    errors: dict[str, list[str]] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"message": message}
    if code:
        payload["code"] = code
    if errors:
        payload["errors"] = errors
    return payload


def error_response(
    message: str,
    *,
    code: str | None = None,
    errors: dict[str, list[str]] | None = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> Response:
    return Response(
        api_error(message, code=code, errors=errors),
        status=status_code,
    )


def validation_error_response(errors: Any) -> Response:
    return Response(
        normalize_error_data(errors, status.HTTP_400_BAD_REQUEST),
        status=status.HTTP_400_BAD_REQUEST,
    )


def _default_code_for_status(status_code: int) -> str:
    return {
        status.HTTP_400_BAD_REQUEST: "bad_request",
        status.HTTP_401_UNAUTHORIZED: "unauthorized",
        status.HTTP_403_FORBIDDEN: "forbidden",
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
        status.HTTP_409_CONFLICT: "conflict",
        status.HTTP_503_SERVICE_UNAVAILABLE: "service_unavailable",
    }.get(status_code, "error")


def _default_message_for_status(status_code: int) -> str:
    return {
        status.HTTP_400_BAD_REQUEST: "Invalid request.",
        status.HTTP_401_UNAUTHORIZED: "Authentication required.",
        status.HTTP_403_FORBIDDEN: "You do not have permission to perform this action.",
        status.HTTP_404_NOT_FOUND: "Resource not found.",
        status.HTTP_405_METHOD_NOT_ALLOWED: "Method not allowed.",
        status.HTTP_409_CONFLICT: "Conflict.",
        status.HTTP_503_SERVICE_UNAVAILABLE: "Service unavailable.",
    }.get(status_code, "Something went wrong.")


def _stringify(value: Any) -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return ""
    return str(value)


def _flatten_field_errors(value: Any, prefix: str = "") -> dict[str, list[str]]:
    errors: dict[str, list[str]] = {}

    if isinstance(value, (list, tuple)):
        string_items = [_stringify(item) for item in value if _stringify(item)]
        if string_items and all(isinstance(item, str) for item in value):
            if prefix:
                errors[prefix] = string_items
            return errors

        for index, item in enumerate(value):
            nested_prefix = f"{prefix}.{index}" if prefix else str(index)
            errors.update(_flatten_field_errors(item, nested_prefix))
        return errors

    if isinstance(value, dict):
        for key, nested_value in value.items():
            nested_prefix = f"{prefix}.{key}" if prefix else str(key)
            errors.update(_flatten_field_errors(nested_value, nested_prefix))
        return errors

    if prefix:
        message = _stringify(value)
        if message:
            errors[prefix] = [message]

    return errors


def _first_error_message(errors: dict[str, list[str]]) -> str | None:
    for messages in errors.values():
        if messages:
            return messages[0]
    return None


def normalize_error_data(data: Any, status_code: int) -> dict[str, Any]:
    if isinstance(data, str):
        return api_error(data, code=_default_code_for_status(status_code))

    if isinstance(data, list):
        message = _stringify(data[0]) if data else _default_message_for_status(status_code)
        return api_error(message, code=_default_code_for_status(status_code))

    if not isinstance(data, dict):
        return api_error(
            _default_message_for_status(status_code),
            code=_default_code_for_status(status_code),
        )

    code = data.get("code") if isinstance(data.get("code"), str) else None
    errors: dict[str, list[str]] = {}
    message: str | None = None

    if "message" in data and isinstance(data["message"], str):
        message = data["message"]

    if "errors" in data and isinstance(data["errors"], dict):
        errors.update(_flatten_field_errors(data["errors"]))

    if "detail" in data:
        detail = data["detail"]
        if isinstance(detail, str):
            message = message or detail
        elif isinstance(detail, list):
            detail_errors = _flatten_field_errors(detail)
            if detail_errors:
                errors.update(detail_errors)
            if not message and detail:
                message = _stringify(detail[0])
        elif isinstance(detail, dict):
            errors.update(_flatten_field_errors(detail))

    for key, value in data.items():
        if key in {"detail", "code", "message", "errors"}:
            continue
        errors.update(_flatten_field_errors(value, key))

    if not message:
        message = _first_error_message(errors) or _default_message_for_status(status_code)

    if not code:
        code = _default_code_for_status(status_code)

    return api_error(message, code=code, errors=errors or None)


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        return None

    response.data = normalize_error_data(response.data, response.status_code)
    return response
