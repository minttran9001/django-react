from django.db.models import F
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from api.models import Conversation
from api.serializers.conversation import ConversationReadSerializer

class ConversationReadView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationReadSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects.filter(members__user=user)
            .annotate(
                unread=F("members__unread"),
                mention_unread=F("members__mention_unread"),
            )
            .filter(members__user=user)
            .select_related("last_message_sender__user")
            .order_by("-last_message_at","-id")
            .distinct()
            .prefetch_related(
                "members__user__profile__avatar",
                "last_message_sender__user__profile__avatar",
            )
            .select_related("last_message_sender__user")
        )