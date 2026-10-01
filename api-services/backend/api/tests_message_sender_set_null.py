from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from api.models import Conversation, Member, Message


class MessageSenderSetNullTests(TestCase):
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
        self.alice_message = Message.objects.create(
            conversation=self.conversation,
            sender=self.alice,
            body="hello from alice",
            status=Message.Status.ACKED,
            client_id="alice-1",
        )
        self.bob_message = Message.objects.create(
            conversation=self.conversation,
            sender=self.bob,
            body="reply from bob",
            status=Message.Status.ACKED,
            client_id="bob-1",
        )
        # Bob is last sender so Conversation.last_message_sender CASCADE
        # (still present on main) does not wipe the thread when Alice is deleted.
        now = timezone.now()
        self.conversation.last_message_at = now
        self.conversation.last_message_content = self.bob_message.body
        self.conversation.last_message_sender = self.bob_member
        self.conversation.save(
            update_fields=[
                "last_message_at",
                "last_message_content",
                "last_message_sender",
                "updated_at",
            ]
        )

    def test_deleting_sender_user_keeps_their_messages(self):
        conversation_id = self.conversation.pk
        alice_message_id = self.alice_message.pk
        bob_message_id = self.bob_message.pk
        bob_member_id = self.bob_member.pk

        self.alice.delete()

        self.assertFalse(User.objects.filter(pk=self.alice.pk).exists())
        self.assertTrue(Conversation.objects.filter(pk=conversation_id).exists())
        self.assertTrue(Member.objects.filter(pk=bob_member_id).exists())
        self.assertTrue(Message.objects.filter(pk=bob_message_id).exists())

        alice_message = Message.objects.get(pk=alice_message_id)
        self.assertIsNone(alice_message.sender_id)
        self.assertEqual(alice_message.body, "hello from alice")

    def test_user_without_messages_still_deletes(self):
        lonely = User.objects.create_user("lonely", "lonely@test.com", "pass")
        lonely_id = lonely.pk
        lonely.delete()
        self.assertFalse(User.objects.filter(pk=lonely_id).exists())
