from rest_framework import serializers

from api.models import CourtCenter

from ..image import ImageResourceSerializer
from ..user import PublicOwnerSerializer, UserIdSerializer, UserReadSerializer


class CourtCenterSummarySerializer(serializers.ModelSerializer):
    logo = ImageResourceSerializer(read_only=True)

    class Meta:
        model = CourtCenter
        fields = [
            "id",
            "title",
            "logo",
            "address",
            "review_count",
            "review_average_rating",
        ]
        read_only_fields = fields


class CourtCenterSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    logo = ImageResourceSerializer(read_only=True)
    images = ImageResourceSerializer(source="gallery", many=True, read_only=True)

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
            "images",
            "status",
            "created_at",
            "updated_at",
            "address",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def get_owner(self, obj):
        visibility = self.context.get("owner_visibility", "id")
        if visibility == "full":
            return UserReadSerializer(obj.owner).data
        if visibility == "public":
            return PublicOwnerSerializer(obj.owner).data
        return UserIdSerializer(obj.owner).data
