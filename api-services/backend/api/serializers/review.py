from rest_framework import serializers
from api.models import Review
from api.serializers.user import PublicOwnerSerializer
from api.serializers.court_center import CourtCenterSummarySerializer

class ReviewSerializer(serializers.ModelSerializer):
    reviewer = PublicOwnerSerializer(read_only=True)
    court_center = CourtCenterSummarySerializer(read_only=True)
    class Meta:
        model = Review
        fields = ['id', 'transaction', 'reviewer', 'court_center', 'rating', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'reviewer', 'court_center', 'created_at', 'updated_at']


class RequestReviewSerializer(serializers.Serializer):
    rating = serializers.IntegerField(required=True)
    comment = serializers.CharField(required=False, allow_null=True)

    def validate(self, attrs):
        if attrs.get("rating") is None:
            raise serializers.ValidationError("Rating is required.")
        return attrs