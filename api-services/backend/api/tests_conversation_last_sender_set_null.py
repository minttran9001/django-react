from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from api.models import Conversation, Member, Message


class ConversationLastMessageSenderSetNullTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "alice@test.com", "pass")
        self.bob = User.objects.create_user("bob", "bob@test.com", "pass")
        self.conversation = Conversation.objects.create(
            type=Conversation.Type.DM,
            name="alice ↔ bob",
        )
        self.alice_member = Member.objects.create(
            user=self.alice,
            conversation=self.conversation,
            unread=0,
            mention_unread=0,
        )
        self.bob_member = Member.objects.create(
            user=self.bob,
            conversation=self.conversation,
            unread=0,
            mention_unread=0,
        )
        self.bob_message = Message.objects.create(
            conversation=self.conversation,
            sender=self.bob,
            body="hello from bob",
            status=Message.Status.ACKED,
            client_id="bob-1",
        )
        self.alice_message = Message.objects.create(
            conversation=self.conversation,
            sender=self.alice,
            body="reply from alice",
            status=Message.Status.ACKED,
            client_id="alice-1",
        )
        now = timezone.now()
        self.conversation.last_message_at = now
        self.conversation.last_message_content = self.alice_message.body
        self.conversation.last_message_sender = self.alice_member
        self.conversation.save(
            update_fields=[
                "last_message_at",
                "last_message_content",
                "last_message_sender",
                "updated_at",
            ]
        )

    def test_deleting_last_sender_member_does_not_wipe_conversation(self):
        conversation_id = self.conversation.pk
        bob_message_id = self.bob_message.pk
        bob_member_id = self.bob_member.pk

        self.alice_member.delete()

        self.assertTrue(Conversation.objects.filter(pk=conversation_id).exists())
        conversation = Conversation.objects.get(pk=conversation_id)
        self.assertIsNone(conversation.last_message_sender_id)
        self.assertTrue(Message.objects.filter(pk=bob_message_id).exists())
        self.assertTrue(Member.objects.filter(pk=bob_member_id).exists())

    def test_deleting_user_who_sent_last_message_keeps_peer_history(self):
        """Admin/user delete cascades Member → must not CASCADE-wipe the Conversation."""
        conversation_id = self.conversation.pk
        bob_message_id = self.bob_message.pk
        bob_member_id = self.bob_member.pk
        alice_message_id = self.alice_message.pk

        self.alice.delete()

        self.assertFalse(User.objects.filter(pk=self.alice.pk).exists())
        self.assertTrue(Conversation.objects.filter(pk=conversation_id).exists())
        conversation = Conversation.objects.get(pk=conversation_id)
        self.assertIsNone(conversation.last_message_sender_id)
        # Peer's membership and messages must survive the wipe that CASCADE caused.
        self.assertTrue(Member.objects.filter(pk=bob_member_id).exists())
        self.assertTrue(Message.objects.filter(pk=bob_message_id).exists())
        # Alice's messages still cascade via Message.sender (separate FK).
        self.assertFalse(Message.objects.filter(pk=alice_message_id).exists())
