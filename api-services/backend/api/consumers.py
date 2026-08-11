from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from api.models import Member


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
            return

        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        if not await self.is_member(user.id, self.conversation_id):
            await self.close()
            return

        self.group = f"chat_{self.conversation_id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content):
        # Optional: typing indicators. Prefer REST for sending messages.
        pass

    async def chat_message(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def is_member(self, user_id, conversation_id):
        return Member.objects.filter(
            user_id=user_id,
            conversation_id=conversation_id,
        ).exists()
