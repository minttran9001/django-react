from rest_framework import serializers
from api.models import Message

class ConversationSeenSerializer(serializers.Serializer):
    message_id = serializers.IntegerField(min_value=1)

    # validate the message id
    def validate(self, attrs):
        conversation_id = self.context.get("conversation_id")
        message_id = attrs.get("message_id")
        if not Message.objects.filter(pk=message_id, conversation_id=conversation_id).exists():
            raise serializers.ValidationError({"message_id": "Message not belongs to the conversation"})
        if Message.objects.get(pk=message_id).sender.id == self.context.get("user").id:
            raise serializers.ValidationError({"message_id": "You cannot mark your own message as seen"})
        return attrs