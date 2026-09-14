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

async def _fanout_typing(self: AsyncJsonWebsocketConsumer, content: dict):
        user = self.scope["user"]
        channel_layer = self.channel_layer
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
            await channel_layer.group_send(
                f"user_{member_id}",
                {
                    "type": "chat.message",
                    "payload": payload,
                },
            )

async def _fanout_seen(self: AsyncJsonWebsocketConsumer, content: dict):
    channel_layer = self.channel_layer
    user = self.scope["user"]
    conversation_id = content.get("conversationId")
    last_read_message_created_at = content.get("lastReadMessageCreatedAt")
    if not conversation_id or not last_read_message_created_at:
        return

    member_ids = await _get_member_ids(conversation_id)
    if user.id not in member_ids:
        return

    # Relay opaque watermark string; consumer does not persist.
    if hasattr(last_read_message_created_at, "isoformat"):
        last_read_message_created_at = last_read_message_created_at.isoformat()

    payload = {
        "type": "seen",
        "conversationId": conversation_id,
        "userId": user.id,
        "lastReadMessageCreatedAt": last_read_message_created_at,
    }

    for member_id in member_ids:
        await channel_layer.group_send(
            f"user_{member_id}",
            {
                "type": "chat.message",
                "payload": payload,
            },
        )

async def _handle_fanout(self, content: dict):
    if content.get("type") == "typing":
        await _fanout_typing(self, content)
    elif content.get("type") == "seen":
        await _fanout_seen(self, content)
    else:
        raise ValueError(f"Invalid type: {content.get('type')}")

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
        await _handle_fanout(self, content)

    async def chat_message(self, event):
        await self.send_json(event["payload"])
