from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from api.models import Image


class ImageResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ["id", "url", "public_id"]
        read_only_fields = fields


class ImageUploadResponseSerializer(serializers.Serializer):
    images = ImageResourceSerializer(many=True)
