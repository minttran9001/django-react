from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from api.serializers import ConversationReadSerializer, ReadMessageListSerializer, ReadMessageSerializer, SendMessageSerializer
from ._helpers import NotConversationMemberError, resolve_conversation_for_send_message, persist_message
from rest_framework.response import Response
from rest_framework import status
from api.utils.exceptions import error_response, validation_error_response
from datetime import datetime
class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        pending_sent = False

        try:
            conversation, sender_member, conv_created = resolve_conversation_for_send_message(request.user, data)
            client_id = data["client_id"]
            body = data["body"]
            # 1) fan-out sớm
            pending = {
                "type": "message.created",
                "conversationId": conversation.id,
                "message": {
                    "id": None,  # hoặc bỏ field
                    "clientId": client_id,
                    "conversationId": conversation.id,
                    "body": body,
                    "status": "pending",
                    "createdAt": int(datetime.now().timestamp() * 1000),
                    "sender": {
                        "id": request.user.id,
                        "name": getattr(getattr(request.user, "profile", None), "name", "") or "",
                        "avatar": None,  # optional load nhẹ
                    },
                },
            }
            async_to_sync(get_channel_layer().group_send)(
                f"chat_{conversation.id}",
                {"type": "chat.message", "payload": pending},
            )
            pending_sent = True
            
            # 2) persist
            message, msg_created = persist_message(conversation, request.user, sender_member, client_id=data["client_id"], body=data["body"])

        except NotConversationMemberError as exc:
            return error_response(str(exc), status_code=status.HTTP_403_FORBIDDEN, code="not_conversation_member")
        except PermissionError as exc:
            return error_response(str(exc), status_code=status.HTTP_403_FORBIDDEN, code="permission_error")
        except ValueError as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST, code="value_error")
        except Exception as exc:
            if pending_sent and conversation is not None:
                async_to_sync(get_channel_layer().group_send)(
                    f"chat_{conversation.id}",
                    {"type": "chat.message", "payload": {
                        "type": "message.failed",
                        "conversationId": conversation.id,
                        "clientId": client_id,
                    }},
                )
            return error_response(str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, code="internal_server_error")


        payload = {
            "conversation": ConversationReadSerializer(conversation).data,
            "message": ReadMessageSerializer(message).data,
            "conversation_created": conv_created,
        }
        # 3) ack camelCase
        msg = ReadMessageListSerializer(message).data
        acked = {
            "type": "message.acked",
            "conversationId": conversation.id,
            "message": {
                "id": msg["id"],
                "clientId": msg["client_id"],
                "conversationId": msg["conversation_id"],
                "body": msg["body"],
                "status": msg["status"],
                "createdAt": int(message.created_at.timestamp() * 1000),
                "sender": msg["sender"],
            },
        }

        async_to_sync(get_channel_layer().group_send)(
            f"chat_{conversation.id}",
            {"type": "chat.message", "payload": acked},
        )


        status_code = 201 if (conv_created or msg_created) else 200

        return Response(payload, status=status_code)