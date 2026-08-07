from django.utils import timezone
from django.db.models import Count, F
from api.models import Conversation, Member, UserProfile, Message
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import transaction

class NotConversationMemberError(PermissionError):
    """User is not a member of the conversation."""


def _display_name(user: User) -> str:
    profile = UserProfile.for_user(user)
    return profile.name or user.email or str(user.id)


def _ensure_member(conversation: Conversation, user_id: int) -> Member:
    member, _ = Member.objects.get_or_create(
        user_id=user_id,
        conversation=conversation,
    )
    return member


def _find_dm_conversation(user: User, peer: User) -> Conversation | None:
     return (
        Conversation.objects.filter(type=Conversation.Type.DM)
        .filter(members__user=user)
        .filter(members__user_id=peer.id)
        .annotate(member_count=Count("members", distinct=True))
        .filter(member_count=2)
        .first()
    )

def _create_conversation_with_members(
    user: User,
    member_user_ids: list[int],
    name: str,
) -> tuple[Conversation, Member, bool]:
    conv_type = (Conversation.Type.DM if len(member_user_ids) == 1 else Conversation.Type.MUC)

    if conv_type == Conversation.Type.DM:
        first_member_id = member_user_ids[0]
        peer = get_object_or_404(User, pk=first_member_id)
        existing = _find_dm_conversation(user, peer)
        if existing:
            sender_member = _ensure_member(existing, user.id)
            return existing, sender_member, False
        default_name = name or _display_name(peer)
        conversation = Conversation.objects.create(
            type=Conversation.Type.DM,
            name=default_name,
        )
        _ensure_member(conversation, peer.id)
        sender_member = _ensure_member(conversation, user.id)
        return conversation, sender_member, True
    
    conversation = Conversation.objects.create(
        type=Conversation.Type.MUC,
        name=name,
    )
    all_user_ids = [user.id] + member_user_ids

    for uid in all_user_ids:
        _ensure_member(conversation, uid)
    sender_member = _ensure_member(conversation, user.id)
    return conversation, sender_member, True

def resolve_conversation_for_send_message(user, data):
    conversation_id = data.get("conversation_id")
    member_user_ids = data.get("member_user_ids")
    name = data.get("name")

    if (conversation_id):
        conversation = get_object_or_404(Conversation, pk=conversation_id)
        sender_member = Member.objects.filter(user=user, conversation=conversation).first()
        if not sender_member:
            raise NotConversationMemberError("You are not a member of this conversation.")
        return conversation, sender_member, False
    if not member_user_ids:
        raise ValueError("Conversation id or member user ids are required.")

    
    return _create_conversation_with_members(user, member_user_ids, name)


@transaction.atomic
def persist_message(conversation: Conversation, sender: User, sender_member: Member, *, client_id: str, body: str) -> tuple[Message, bool]:
    message, created = Message.objects.get_or_create(
        client_id=client_id,
        defaults={
            "conversation": conversation,
            "sender": sender,
            "body": body,
            'status': Message.Status.ACKED,
        }
    )
    now = timezone.now()
    conversation.last_message_at = now
    conversation.last_message_content = body
    conversation.last_message_sender = sender_member
    conversation.save(
        update_fields=[
            "last_message_at",
            "last_message_content",
            "last_message_sender",
            "updated_at",
        ]
    )
    Member.objects.filter(conversation=conversation).exclude(user=sender).update(
        unread=F("unread") + 1
    )
    return message, created