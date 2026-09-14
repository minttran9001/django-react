from rest_framework import serializers
from api.models import Conversation, Member
from api.serializers.user import PublicOwnerSerializer

class LastMessageSenderSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(source="user_id")
    name = serializers.SerializerMethodField()
    def get_name(self, member: Member) -> str:
        profile = getattr(member.user, "profile", None)
        if profile and profile.name:
            return profile.name
        return member.user.email or str(member.user_id)

class ConversationMemberSerializer(serializers.ModelSerializer):
    user = PublicOwnerSerializer(read_only=True)    
    class Meta:
        model = Member
        fields = ["user", "unread", "mention_unread", "last_read_message_id", "last_read_at", "last_read_message_created_at"]



class ConversationReadSerializer(serializers.ModelSerializer):
    unread = serializers.IntegerField(read_only=True)
    mention_unread = serializers.IntegerField(read_only=True)
    last_message_preview = serializers.CharField(
        source="last_message_content", allow_null=True
    )
    last_message_sender = ConversationMemberSerializer(
        read_only=True, allow_null=True
    )
    members = ConversationMemberSerializer(many=True, read_only=True)
    class Meta:
        model = Conversation
        fields = [
            "id", "name", "type",
            "unread", "mention_unread",
            "last_message_at", "last_message_preview",
            "last_message_sender", "members",
        ]
