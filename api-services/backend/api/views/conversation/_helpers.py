from django.db import transaction
from api.models import Member, Conversation, Message
from django.shortcuts import get_object_or_404
from django.utils import timezone

class NotConversationMemberError(PermissionError):
    """User is not a member of the conversation."""


@transaction.atomic
def persist_seen_message(user, conversation_id: int, message_id: int) -> tuple[Member, bool]:
    conversation = get_object_or_404(Conversation, pk=conversation_id)
    member = (
        Member.objects.select_for_update()
        .filter(user=user, conversation=conversation)
        .first()
    )
    if not member:
        raise NotConversationMemberError("You are not a member of this conversation")
    
    current_message = member.last_read_message

    if current_message is not None and message_id <= current_message.id:
        return member, False # no-op, message is already read
    
    now = timezone.now()

    remaining_unread = Message.objects.filter(
        conversation=conversation,
        id__gt=message_id,
    ).count()

    member.last_read_message = Message.objects.get(pk=message_id)
    member.last_read_at = now
    member.unread = remaining_unread
    member.save(
        update_fields=[
            "last_read_message",
            "last_read_at",
            "unread",
            "updated_at",
        ]
    )

    return member, True