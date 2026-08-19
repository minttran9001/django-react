from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from api.models import Member


@database_sync_to_async
def _get_member_ids(conversation_id: int) -> list[int]:
    return list(
        Member.objects.filter(conversation_id=conversation_id).values_list(
            "user_id", flat=True
        )
    )


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
            return
        self.group = f"user_{user.id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content):
        if content.get("type") != "typing":
            return

        user = self.scope["user"]
        conversation_id = content.get("conversationId")
        if not conversation_id:
            return

        member_ids = await _get_member_ids(conversation_id)
        if user.id not in member_ids:
            return

        payload = {
            "type": "typing",
            "conversationId": conversation_id,
            "userId": user.id,
            "typing": bool(content.get("typing", False)),
        }

        for member_id in member_ids:
            if member_id == user.id:
                continue
            await self.channel_layer.group_send(
                f"user_{member_id}",
                {
                    "type": "chat.message",
                    "payload": payload,
                },
            )

    async def chat_message(self, event):
        await self.send_json(event["payload"])
