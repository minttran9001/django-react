from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from api.models import Conversation, Member, Message
from api.serializers.message import MessageListQuerySerializer, ReadMessageListSerializer
from api.utils.typed_resource import RESOURCE_MESSAGE, typed_resource

class ReadMessageListAPIView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReadMessageListSerializer

    def get_queryset(self):
        conversation_id = self.kwargs.get("conversation_id")
        conversation = get_object_or_404(Conversation, id=conversation_id)

        is_member = Member.objects.filter(conversation=conversation, user=self.request.user).exists()

        if not is_member:
            raise PermissionDenied("You are not a member of this conversation")
        
        return Message.objects.filter(conversation=conversation).select_related("sender", "sender__profile", "sender__profile__avatar").order_by("created_at")

    def list(self, request, *args, **kwargs):
        query = MessageListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        limit = query.validated_data.get("limit")
        before_id = query.validated_data.get("before_id")
        after_id = query.validated_data.get("after_id")

        qs = self.get_queryset() # member

        if before_id:
            # older than cursor (Scroll up)
            qs = qs.filter(id__lt=before_id).order_by("-id")
        elif after_id:
            # newer than cursor (Scroll down)
            qs = qs.filter(id__gt=after_id).order_by("id")
        else:
            # first page
            qs = qs.order_by("-id")

        rows = list(qs[:limit + 1]) # fetch one extra row to check if there are more rows
        has_more = len(rows) > limit
        rows = rows[:limit]

        # UI usually wants chronological (old → new)
        if not after_id:
            rows = list(reversed(rows))

        # Cursor for the next older page = oldest id in this page
        next_before_id = rows[0].id if has_more and rows else None
        
        return Response(
            typed_resource(
                RESOURCE_MESSAGE,
                {
                    "results": ReadMessageListSerializer(rows, many=True).data,
                    "has_more": has_more,
                    "next_before_id": next_before_id,
                },
            )
        )
        