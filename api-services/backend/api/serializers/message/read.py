from rest_framework import serializers
from api.models import Message
from api.serializers.user import PublicOwnerSerializer

class ReadMessageSerializer(serializers.ModelSerializer):
    """Full message resource for send ACK — must include sender + conversation.

    The web client ingests the HTTP send response over the optimistic row and
    writes it to IndexedDB. A truncated payload (id/body/status only) wipes
    sender/conversationId and crashes MessageList on message.sender.id.
    """

    client_id = serializers.CharField(max_length=255)
    sender = PublicOwnerSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "client_id",
            "conversation_id",
            "body",
            "status",
            "created_at",
            "sender",
        ]


class MessageListQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(min_value=1, max_value=100, default=40)
    before_id = serializers.IntegerField(required=False, min_value=1)
    # optional: after_id for loading newer (polling / reconnect)
    after_id = serializers.IntegerField(required=False, min_value=1)



class ReadMessageListSerializer(serializers.ModelSerializer):
    sender = PublicOwnerSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "client_id",
            "conversation_id",
            "body",
            "status",
            "created_at",
            "sender",
        ]