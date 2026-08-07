from django.contrib.auth.models import User
from django.db import models


class Message(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "PENDING"
        SENT = "sent", "SENT"
        ACKED = "acked", "ACKED"
        FAILED = "failed", "FAILED"

    conversation = models.ForeignKey(
        "Conversation",
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages_sender")
    body = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    client_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=255, choices=Status.choices, default=Status.PENDING)

    class Meta:
        # Add a unique constraint on the client_id field to ensure that each message is sent only once
        constraints = [
            models.UniqueConstraint(fields=["client_id"], name="unique_conversation_client_id"),
        ]

        # Add indexes for the conversation and client_id fields
        indexes = [
            models.Index(fields=["conversation"]),
            models.Index(fields=["client_id"]),
        ]