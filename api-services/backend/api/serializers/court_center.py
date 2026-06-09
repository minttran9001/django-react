from rest_framework import serializers

from api.models import CourtCenter

from .image import ImageSerializer


class CourtCenterSerializer(serializers.ModelSerializer):
    logo = ImageSerializer(read_only=True)
    gallery = ImageSerializer(many=True, read_only=True)

    class Meta:
        model = CourtCenter
        fields = [
            "id",
            "owner",
            "title",
            "description",
            "latitude",
            "longitude",
            "logo",
            "gallery",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]
