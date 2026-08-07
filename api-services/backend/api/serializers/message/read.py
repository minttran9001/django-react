from rest_framework import serializers
from api.models import Conversation, Message

class ReadMessageSerializer(serializers.ModelSerializer):
    client_id = serializers.CharField(max_length=255)

    class Meta:
        model = Message
        fields = ["id", "client_id", "body", "status", "created_at"]


class ConversationBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ["id", "name", "type"]