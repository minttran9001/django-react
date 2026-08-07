from django.contrib.auth.models import User
from django.db import models


class Member(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="members")
    conversation = models.ForeignKey(
        "Conversation",
        on_delete=models.CASCADE,
        related_name="members",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    unread = models.IntegerField(default=0)
    mention_unread = models.IntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["conversation"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.conversation.name}"