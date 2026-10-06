from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from api.serializers import (
    ConversationReadSerializer,
    ReadMessageListSerializer,
    ReadMessageSerializer,
    SendMessageSerializer,
)
from ._helpers import NotConversationMemberError, resolve_conversation_for_send_message, persist_message
from rest_framework.response import Response
from rest_framework import status
from api.utils.exceptions import error_response
from api.utils.typed_resource import RESOURCE_CONVERSATION, RESOURCE_MESSAGE, typed_resource
from django.utils import timezone
from api.models import Member


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        pending_sent = False
        conversation = None
        client_id = data.get("client_id")

        try:
            conversation, sender_member, conv_created = resolve_conversation_for_send_message(request.user, data)
            client_id = data["client_id"]
            body = data["body"]
            # Client timestamps are for outbox ordering only. Far-future values
            # pin the conversation and make peer unread impossible to clear
            # (seen watermarks use created_at). Clamp to a small clock-skew window.
            now = timezone.now()
            created_at = data.get("created_at", now)
            max_future = now + timedelta(minutes=5)
            if created_at > max_future:
                created_at = now
            # Same shape as message list; camelCase avatar for WS (no DRF camel middleware)
            # 1) fan-out sớm
            pending = {
                "type": "message.created",
                "conversationId": conversation.id,
                "message": {
                    "id": None,
                    "clientId": client_id,
                    "conversationId": conversation.id,
                    "body": body,
                    "status": "sent",
                    "createdAt": created_at.isoformat(),
                    "sender": {
                        "id": request.user.id,
                    },
                },
            }
            member_ids = list(Member.objects.filter(conversation=conversation).values_list("user_id", flat=True))
            channel_layer = get_channel_layer()
            for member_id in member_ids:
                async_to_sync(channel_layer.group_send)(
                    f"user_{member_id}",
                    {
                        "type": "chat.message",
                        "payload": pending,
                    },
                )
            pending_sent = True

            # 2) persist
            message, msg_created = persist_message(
                conversation,
                request.user,
                sender_member,
                client_id=data["client_id"],
                body=data["body"],
                created_at=created_at,
            )

        except NotConversationMemberError as exc:
            return error_response(str(exc), status_code=status.HTTP_403_FORBIDDEN, code="not_conversation_member")
        except PermissionError as exc:
            return error_response(str(exc), status_code=status.HTTP_403_FORBIDDEN, code="permission_error")
        except ValueError as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST, code="value_error")
        except Exception as exc:
            if pending_sent and conversation is not None:
                channel_layer = get_channel_layer()
                fail_payload = {
                    "type": "message.failed",
                    "conversationId": conversation.id,
                    "clientId": client_id,
                }
                for member_id in member_ids:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{member_id}",
                        {
                            "type": "chat.message",
                            "payload": fail_payload,
                        },
                    )
            return error_response(
                str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code="internal_server_error",
            )

        payload = {
            "conversation": typed_resource(
                RESOURCE_CONVERSATION,
                ConversationReadSerializer(conversation).data,
            ),
            "message": typed_resource(
                RESOURCE_MESSAGE,
                ReadMessageSerializer(message).data,
            ),
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
                "createdAt": message.created_at.isoformat(),
                "sender": {
                    "id": request.user.id,
                },
            },
        }

        for member_id in member_ids:
            async_to_sync(get_channel_layer().group_send)(
                f"user_{member_id}",
                {"type": "chat.message", "payload": acked},
            )

      
        status_code = 201 if (conv_created or msg_created) else 200

        return Response(payload, status=status_code)
