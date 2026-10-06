from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from api.models import Conversation, Member, Message
from api.views.message._helpers import persist_message


class PersistMessageIdempotencyTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "alice@example.com", "pass")
        self.bob = User.objects.create_user("bob", "bob@example.com", "pass")
        self.carol = User.objects.create_user("carol", "carol@example.com", "pass")

        self.conv_ab = Conversation.objects.create(type=Conversation.Type.DM, name="ab")
        self.alice_ab = Member.objects.create(user=self.alice, conversation=self.conv_ab)
        self.bob_ab = Member.objects.create(user=self.bob, conversation=self.conv_ab)

        self.conv_ac = Conversation.objects.create(type=Conversation.Type.DM, name="ac")
        self.alice_ac = Member.objects.create(user=self.alice, conversation=self.conv_ac)
        self.carol_ac = Member.objects.create(user=self.carol, conversation=self.conv_ac)

    def test_same_client_id_can_be_used_in_different_conversations(self):
        created_at = timezone.now()
        msg_ab, created_ab = persist_message(
            self.conv_ab,
            self.alice,
            self.alice_ab,
            client_id="shared-client-id",
            body="hello bob",
            created_at=created_at,
        )
        msg_ac, created_ac = persist_message(
            self.conv_ac,
            self.alice,
            self.alice_ac,
            client_id="shared-client-id",
            body="hello carol",
            created_at=created_at,
        )

        self.assertTrue(created_ab)
        self.assertTrue(created_ac)
        self.assertNotEqual(msg_ab.id, msg_ac.id)
        self.assertEqual(msg_ab.conversation_id, self.conv_ab.id)
        self.assertEqual(msg_ac.conversation_id, self.conv_ac.id)
        self.assertEqual(msg_ab.body, "hello bob")
        self.assertEqual(msg_ac.body, "hello carol")

        self.conv_ab.refresh_from_db()
        self.conv_ac.refresh_from_db()
        self.assertEqual(self.conv_ab.last_message_content, "hello bob")
        self.assertEqual(self.conv_ac.last_message_content, "hello carol")

        self.bob_ab.refresh_from_db()
        self.carol_ac.refresh_from_db()
        self.assertEqual(self.bob_ab.unread, 1)
        self.assertEqual(self.carol_ac.unread, 1)

    def test_idempotent_retry_does_not_reincrement_unread_or_overwrite_last_message(self):
        created_at = timezone.now()
        first, created_first = persist_message(
            self.conv_ab,
            self.alice,
            self.alice_ab,
            client_id="retry-id",
            body="first send",
            created_at=created_at,
        )
        self.assertTrue(created_first)

        later = created_at + timedelta(seconds=5)
        second, created_second = persist_message(
            self.conv_ab,
            self.bob,
            self.bob_ab,
            client_id="other-id",
            body="bob reply",
            created_at=later,
        )
        self.assertTrue(created_second)

        self.bob_ab.refresh_from_db()
        self.alice_ab.refresh_from_db()
        unread_bob_before_retry = self.bob_ab.unread
        unread_alice_before_retry = self.alice_ab.unread

        retry, created_retry = persist_message(
            self.conv_ab,
            self.alice,
            self.alice_ab,
            client_id="retry-id",
            body="first send (retry)",
            created_at=created_at,
        )

        self.assertFalse(created_retry)
        self.assertEqual(retry.id, first.id)
        self.assertEqual(Message.objects.filter(conversation=self.conv_ab).count(), 2)

        self.conv_ab.refresh_from_db()
        self.bob_ab.refresh_from_db()
        self.alice_ab.refresh_from_db()
        self.assertEqual(self.conv_ab.last_message_content, "bob reply")
        self.assertEqual(self.bob_ab.unread, unread_bob_before_retry)
        self.assertEqual(self.alice_ab.unread, unread_alice_before_retry)

    def test_older_created_at_does_not_bury_newer_last_message(self):
        newer = timezone.now()
        older = newer - timedelta(minutes=2)

        persist_message(
            self.conv_ab,
            self.alice,
            self.alice_ab,
            client_id="newer-id",
            body="newer preview",
            created_at=newer,
        )
        persist_message(
            self.conv_ab,
            self.bob,
            self.bob_ab,
            client_id="older-outbox-id",
            body="older outbox body",
            created_at=older,
        )

        self.conv_ab.refresh_from_db()
        self.assertEqual(self.conv_ab.last_message_content, "newer preview")
        self.assertEqual(self.conv_ab.last_message_at, newer)
