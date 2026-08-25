"""Seed sample conversations and messages for a user account."""

import uuid

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from api.models import Conversation, Member, Message, UserProfile


def _display_name(user: User) -> str:
    profile = UserProfile.for_user(user)
    return profile.name or user.email or str(user.id)


def _find_dm_conversation(user: User, peer: User) -> Conversation | None:
    return (
        Conversation.objects.filter(type=Conversation.Type.DM)
        .filter(members__user=user)
        .filter(members__user_id=peer.id)
        .distinct()
        .order_by("-last_message_at", "-id")
        .first()
    )


def _ensure_dm(user: User, peer: User) -> tuple[Conversation, bool]:
    existing = _find_dm_conversation(user, peer)
    if existing:
        return existing, False

    conversation = Conversation.objects.create(
        type=Conversation.Type.DM,
        name=_display_name(peer),
    )
    Member.objects.get_or_create(user=user, conversation=conversation)
    Member.objects.get_or_create(user=peer, conversation=conversation)
    return conversation, True


def _ensure_muc(user: User, name: str, member_users: list[User]) -> tuple[Conversation, bool]:
    member_ids = {user.id, *(u.id for u in member_users)}
    existing = (
        Conversation.objects.filter(type=Conversation.Type.MUC, name=name)
        .annotate(member_count=Count("members", distinct=True))
        .filter(member_count=len(member_ids))
        .filter(members__user=user)
        .first()
    )
    if existing:
        for uid in member_ids:
            Member.objects.get_or_create(user_id=uid, conversation=existing)
        return existing, False

    conversation = Conversation.objects.create(type=Conversation.Type.MUC, name=name)
    for uid in member_ids:
        Member.objects.get_or_create(user_id=uid, conversation=conversation)
    return conversation, True


def _add_message(
    conversation: Conversation,
    sender: User,
    body: str,
    *,
    client_id: str | None = None,
) -> Message:
    client_id = client_id or f"seed-{uuid.uuid4()}"
    sender_member = Member.objects.get(user=sender, conversation=conversation)
    message, _ = Message.objects.get_or_create(
        client_id=client_id,
        defaults={
            "conversation": conversation,
            "sender": sender,
            "body": body,
            "status": Message.Status.ACKED,
        },
    )
    conversation.last_message_at = message.created_at
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
    return message


SAMPLE_LINES = [
    "Hey, are you free later?",
    "Sounds good — what time works?",
    "How about 6pm at the courts?",
    "Perfect, I'll book a slot.",
    "Did you see the new schedule?",
    "Yes, Saturday morning looks open.",
    "Great, let's do a doubles game.",
    "Can you invite Minh as well?",
    "Already did — waiting for a reply.",
    "Awesome. Bring an extra racket if you can.",
    "Will do. See you there!",
    "Quick update: court 3 is free.",
    "Nice, switching to court 3.",
    "Anyone still joining tonight?",
    "I'm in.",
    "Same here.",
    "Running 10 minutes late, sorry!",
    "No worries, we'll warm up.",
    "Game was fun yesterday.",
    "We should play again next week.",
]


def _seed_extra_messages(
    user: User,
    *,
    per_conversation: int,
    batch_id: str,
) -> int:
    """Add more messages to every conversation the user belongs to."""
    conversations = list(
        Conversation.objects.filter(members__user=user).distinct()
    )
    created = 0
    now = timezone.now()

    for conv in conversations:
        members = list(
            Member.objects.filter(conversation=conv).select_related("user")
        )
        if not members:
            continue

        senders = [m.user for m in members]
        member_by_user_id = {m.user_id: m for m in members}
        to_create: list[Message] = []

        for i in range(per_conversation):
            sender = senders[i % len(senders)]
            body = SAMPLE_LINES[i % len(SAMPLE_LINES)]
            if conv.type == Conversation.Type.MUC:
                body = f"[{conv.name}] {body}"
            to_create.append(
                Message(
                    conversation=conv,
                    sender=sender,
                    body=body,
                    client_id=f"seed-extra-{batch_id}-c{conv.id}-{i}",
                    status=Message.Status.ACKED,
                )
            )

        Message.objects.bulk_create(to_create, ignore_conflicts=True)
        created += len(to_create)

        last = to_create[-1]
        last_sender_member = member_by_user_id[last.sender_id]
        Conversation.objects.filter(pk=conv.pk).update(
            last_message_at=now,
            last_message_content=last.body,
            last_message_sender=last_sender_member,
            updated_at=now,
        )
        Member.objects.filter(conversation=conv).exclude(user=user).update(unread=3)
        Member.objects.filter(conversation=conv, user=user).update(
            unread=0,
            mention_unread=1 if conv.type == Conversation.Type.MUC else 0,
        )

    return created


class Command(BaseCommand):
    help = "Seed sample conversations and messages for a user email"

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            default="thanhminh.uit@gmail.com",
            help="Target user email (default: thanhminh.uit@gmail.com)",
        )
        parser.add_argument(
            "--messages",
            type=int,
            default=0,
            help=(
                "If > 0, only add this many new messages to each existing "
                "conversation (skip creating new conversations)."
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"]
        messages_per_conv = options["messages"]
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f"No user with email {email}")

        if messages_per_conv > 0:
            batch_id = uuid.uuid4().hex[:8]
            created = _seed_extra_messages(
                user,
                per_conversation=messages_per_conv,
                batch_id=batch_id,
            )
            total_convs = (
                Conversation.objects.filter(members__user=user).distinct().count()
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Added {created} messages across {total_convs} conversation(s) "
                    f"for {email} ({messages_per_conv}/conversation)."
                )
            )
            return

        peers = list(User.objects.exclude(id=user.id).order_by("id")[:4])
        if len(peers) < 2:
            raise CommandError("Need at least 2 other users in the database to seed conversations")

        created_count = 0
        message_count = 0

        for peer in peers[:2]:
            conv, created = _ensure_dm(user, peer)
            if created:
                created_count += 1
            _add_message(conv, peer, f"Hey {_display_name(user)}, are you free this weekend?")
            message_count += 1
            _add_message(conv, user, f"Hi {_display_name(peer)}! Maybe Saturday morning?")
            message_count += 1
            Member.objects.filter(conversation=conv, user=peer).update(unread=2, mention_unread=0)
            Member.objects.filter(conversation=conv, user=user).update(unread=0, mention_unread=0)

        muc_peers = peers[:3]
        conv, created = _ensure_muc(user, "Padel Group", muc_peers)
        if created:
            created_count += 1
        for i, member in enumerate([user, muc_peers[0], muc_peers[1]]):
            _add_message(
                conv,
                member,
                f"Welcome to Padel Group — message {i + 1}",
                client_id=f"seed-muc-padel-{member.id}-{i}",
            )
            message_count += 1
        Member.objects.filter(conversation=conv).exclude(user=user).update(unread=1)
        Member.objects.filter(conversation=conv, user=user).update(unread=0, mention_unread=1)

        if len(peers) >= 3:
            conv2, created2 = _ensure_muc(user, "Court Booking Chat", peers[1:3])
            if created2:
                created_count += 1
            _add_message(
                conv2,
                peers[1],
                "Anyone want to book a court tomorrow?",
                client_id=f"seed-muc-court-{peers[1].id}",
            )
            message_count += 1
            _add_message(
                conv2,
                user,
                "I'm interested — what time?",
                client_id=f"seed-muc-court-{user.id}",
            )
            message_count += 1
            Member.objects.filter(conversation=conv2, user=user).update(unread=0)
            Member.objects.filter(conversation=conv2).exclude(user=user).update(unread=0)

        total = Conversation.objects.filter(members__user=user).distinct().count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded for {email} (id={user.id}): "
                f"{created_count} new conversation(s), {message_count} messages touched, "
                f"{total} total conversation(s) for this user."
            )
        )
