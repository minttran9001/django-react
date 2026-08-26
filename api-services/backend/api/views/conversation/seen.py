from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from api.serializers.conversation import ConversationSeenSerializer
from api.views.conversation._helpers import NotConversationMemberError, persist_seen_message
from api.utils.exceptions import error_response

class ConversationSeenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        conversation_id = kwargs.get("conversation_id")
        serializer = ConversationSeenSerializer(
            data=request.data,
            context={"conversation_id": conversation_id, "user": request.user}
        )

        serializer.is_valid(raise_exception=True)
        
        message_id = serializer.validated_data.get("message_id")

        try:
            persist_seen_message(request.user, conversation_id, message_id)

        except NotConversationMemberError as e:
            return error_response(str(e), status_code=status.HTTP_403_FORBIDDEN, code="NOT_CONVERSATION_MEMBER")

        return Response(status=status.HTTP_200_OK)