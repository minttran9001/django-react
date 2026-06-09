from rest_framework import serializers

from api.models import Image


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ["id", "file", "kind", "caption", "sort_order", "created_at"]
        read_only_fields = ["id", "created_at"]
