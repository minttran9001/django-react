"""Send ACK must return a full message resource (sender + conversation_id)."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from api.models import Conversation, Member, Message
from api.serializers.message.read import ReadMessageSerializer

User = get_user_model()


class ReadMessageSerializerSendAckTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="sender@example.com",
            email="sender@example.com",
            password="pass",
        )
        self.conversation = Conversation.objects.create(type="dm", name="Test")
        Member.objects.create(conversation=self.conversation, user=self.user)
        self.message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            client_id="client-1",
            body="hello",
            status=Message.Status.ACKED,
        )

    def test_send_ack_includes_sender_and_conversation(self):
        data = ReadMessageSerializer(self.message).data
        self.assertEqual(data["id"], self.message.id)
        self.assertEqual(data["client_id"], "client-1")
        self.assertEqual(data["conversation_id"], self.conversation.id)
        self.assertEqual(data["body"], "hello")
        self.assertIn("sender", data)
        sender = data["sender"]
        # PublicOwnerSerializer wraps as typed_resource {type, data}
        sender_id = (
            sender.get("id")
            if isinstance(sender, dict) and "id" in sender
            else (sender.get("data") or {}).get("id")
        )
        self.assertEqual(sender_id, self.user.id)
        for required in ("sender", "conversation_id", "client_id", "body", "status"):
            self.assertIn(required, data)
