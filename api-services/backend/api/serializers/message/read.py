from rest_framework import serializers
from api.models import Message
from api.serializers.user import PublicOwnerSerializer

class ReadMessageSerializer(serializers.ModelSerializer):
    client_id = serializers.CharField(max_length=255)

    class Meta:
        model = Message
        fields = ["id", "client_id", "body", "status", "created_at"]


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