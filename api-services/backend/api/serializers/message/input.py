from rest_framework import serializers
from api.models import Conversation

class SendMessageSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=1000, allow_blank=False)
    client_id = serializers.CharField(max_length=255)


    conversation_id = serializers.IntegerField(required=False)

    # only for new thread
    member_user_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    name = serializers.CharField(max_length=255, required=False)

    def validate(self, attrs):
        request = self.context["request"]
        current_user = request.user if request else None
        if (attrs.get("conversation_id")):
            return attrs
        ids = attrs.get("member_user_ids")
        if (ids):
            if len(ids) == 0:
                raise serializers.ValidationError("Member user ids must be at least 1")
            if len(set(ids)) != len(ids):
                raise serializers.ValidationError("Member user ids must be unique")
            if len(ids) == 1 and current_user and ids[0] == current_user.id:
                raise serializers.ValidationError({"member_user_ids": "You cannot send a message to yourself"})
            if current_user and current_user.id in ids:
                raise serializers.ValidationError({"member_user_ids": "You cannot send a message to yourself"})
            else:
                return attrs

        raise serializers.ValidationError("Conversation id or member user ids are required")
