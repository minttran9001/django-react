"""Sharetribe-style resource envelope: { "type": "<kind>", "data": ... }."""

RESOURCE_USER = "user"
RESOURCE_CONVERSATION = "conversation"
RESOURCE_COURT_CENTER = "courtCenter"
RESOURCE_MESSAGE = "message"
RESOURCE_TRANSACTION = "transaction"


def typed_resource(resource_type: str, data):
    return {"type": resource_type, "data": data}
