from datetime import datetime, timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from api.models import Conversation, Member, Message


class NotConversationMemberError(PermissionError):
    """User is not a member of the conversation."""


@transaction.atomic
def persist_seen_watermark(
    user,
    conversation_id: int,
    created_at: datetime,
    client_id: str | None = None,
) -> tuple[Member, bool]:
    conversation = get_object_or_404(Conversation, pk=conversation_id)
    member = (
        Member.objects.select_for_update()
        .filter(user=user, conversation=conversation)
        .first()
    )
    if not member:
        raise NotConversationMemberError("You are not a member of this conversation")

    # JS Date is millisecond-precision; Django stores microseconds.
    upper = created_at + timedelta(milliseconds=1)

    resolved_by_client_id = False
    message = None
    if client_id:
        message = Message.objects.filter(
            conversation=conversation,
            client_id=client_id,
        ).first()
        resolved_by_client_id = message is not None

    if resolved_by_client_id:
        # Prefer the precise server timestamp once the row exists.
        watermark = message.created_at
    else:
        # Authoritative client watermark — keep it even when the row is not
        # persisted yet so unread stays correct after the later insert.
        watermark = created_at
        message = (
            Message.objects.filter(
                conversation=conversation,
                created_at__lt=upper,
            )
            .order_by("-created_at", "-id")
            .first()
        )

    if (
        member.last_read_message_created_at is not None
        and member.last_read_message_created_at >= watermark
        and (
            message is None
            or member.last_read_message_id == message.id
        )
    ):
        return member, False

    remaining_unread = (
        Message.objects.filter(
            conversation=conversation,
            created_at__gt=watermark,
        )
        .exclude(sender=user)
        .count()
    )

    member.last_read_message = message
    member.last_read_at = timezone.now()
    member.last_read_message_created_at = watermark
    member.unread = remaining_unread
    member.save(
        update_fields=[
            "last_read_message",
            "last_read_at",
            "last_read_message_created_at",
            "unread",
            "updated_at",
        ]
    )

    return member, True
