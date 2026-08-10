from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from api.serializers import ConversationReadSerializer, ReadMessageSerializer, SendMessageSerializer
from ._helpers import NotConversationMemberError, resolve_conversation_for_send_message, persist_message
from rest_framework.response import Response
from rest_framework import status
from api.utils.exceptions import error_response, validation_error_response

class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            conversation, sender_member, conv_created = resolve_conversation_for_send_message(request.user, data)
            message, msg_created = persist_message(conversation, request.user, sender_member, client_id=data["client_id"], body=data["body"])
        except NotConversationMemberError as exc:
            return error_response(str(exc), status_code=status.HTTP_403_FORBIDDEN, code="not_conversation_member")
        except PermissionError as exc:
            return error_response(str(exc), status_code=status.HTTP_403_FORBIDDEN, code="permission_error")
        except ValueError as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST, code="value_error")
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, code="internal_server_error")

        payload = {
            "conversation": ConversationReadSerializer(conversation).data,
            "message": ReadMessageSerializer(message).data,
            "conversation_created": conv_created,
        }

        status_code = 201 if (conv_created or msg_created) else 200

        return Response(payload, status=status_code)