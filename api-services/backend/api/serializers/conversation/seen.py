from rest_framework import serializers


class ConversationSeenSerializer(serializers.Serializer):
    created_at = serializers.DateTimeField()
    client_id = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )
