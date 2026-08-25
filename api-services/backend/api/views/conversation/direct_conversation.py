from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from django.contrib.auth.models import User
from ..message._helpers import _find_dm_conversation
from api.serializers.conversation import ConversationReadSerializer
from api.utils.typed_resource import RESOURCE_CONVERSATION, typed_resource

class DirectConversationView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        raw_user_id = request.query_params.get("user_id")

        if not raw_user_id:
            raise ValidationError({"user_id": "This field is required."})
        
        try:
            recipient_user_id = int(raw_user_id)
        except ValueError:
            raise ValidationError({"user_id": "This field must be an integer."})
        
        if recipient_user_id == request.user.id:
            raise PermissionDenied({"user_id": "You cannot send a message to yourself."})
        
        try:
            peer = User.objects.get(pk=recipient_user_id)
        except User.DoesNotExist:
            raise NotFound("User not found.")
        conversation = _find_dm_conversation(request.user, peer)
        if not conversation:
            return Response(typed_resource(RESOURCE_CONVERSATION, None))

        member = conversation.members.get(user=request.user)
        conversation.unread = member.unread
        conversation.mention_unread = member.mention_unread

        return Response(
            typed_resource(
                RESOURCE_CONVERSATION,
                ConversationReadSerializer(conversation).data,
            )
        )
