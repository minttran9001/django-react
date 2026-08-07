from django.db import models
from .member import Member

class Conversation(models.Model):
    class Type(models.TextChoices):
        DM = "dm", "DM"
        MUC = "muc", "MUC"

    # Type of conversation
    type = models.CharField(max_length=255, choices=Type.choices)
    # Created at
    created_at = models.DateTimeField(auto_now_add=True)
    # Updated at
    updated_at = models.DateTimeField(auto_now=True)
    # Last message at
    last_message_at = models.DateTimeField(null=True, blank=True)
    # Last message content
    last_message_content = models.TextField(null=True, blank=True)
    # Last message sender
    last_message_sender = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="last_message_sender", null=True, blank=True)
    # Name of the conversation
    name = models.CharField(max_length=255, null=True, blank=True)