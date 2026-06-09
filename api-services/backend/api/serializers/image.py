from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from api.models import Court, CourtCenter, Image


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ["id", "file", "kind", "caption", "sort_order", "created_at"]
        read_only_fields = ["id", "created_at"]


class ImageUploadSerializer(serializers.ModelSerializer):
    content_type = serializers.SlugField()
    object_id = serializers.IntegerField(min_value=1)

    class Meta:
        model = Image
        fields = ["file", "kind", "caption", "sort_order", "content_type", "object_id"]
        extra_kwargs = {
            "caption": {"required": False, "allow_blank": True},
            "sort_order": {"required": False},
        }

    def validate_content_type(self, value):
        allowed = {"courtcenter", "court"}
        model_name = value.lower()
        if model_name not in allowed:
            raise serializers.ValidationError(
                "content_type must be 'courtcenter' or 'court'."
            )
        return model_name

    def validate(self, attrs):
        request = self.context["request"]
        model_name = attrs.pop("content_type")
        object_id = attrs["object_id"]
        kind = attrs.get("kind", Image.Kind.GALLERY)

        try:
            content_type = ContentType.objects.get(app_label="api", model=model_name)
        except ContentType.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"content_type": "Unsupported content type."}
            ) from exc

        model_class = content_type.model_class()
        if model_class is None:
            raise serializers.ValidationError(
                {"content_type": "Unsupported content type."}
            )

        try:
            target = model_class.objects.get(pk=object_id)
        except model_class.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"object_id": "Target object not found."}
            ) from exc

        if isinstance(target, CourtCenter):
            if target.owner_id != request.user.id:
                raise serializers.ValidationError(
                    "You do not have permission to upload images for this court center."
                )
        elif isinstance(target, Court):
            if target.center.owner_id != request.user.id:
                raise serializers.ValidationError(
                    "You do not have permission to upload images for this court."
                )
            if kind == Image.Kind.LOGO:
                raise serializers.ValidationError(
                    {"kind": "Courts only support gallery images."}
                )
        else:
            raise serializers.ValidationError(
                {"content_type": "Unsupported content type."}
            )

        attrs["content_type"] = content_type
        return attrs

    def create(self, validated_data):
        kind = validated_data.get("kind", Image.Kind.GALLERY)
        content_type = validated_data["content_type"]
        object_id = validated_data["object_id"]

        if kind == Image.Kind.LOGO:
            Image.objects.filter(
                content_type=content_type,
                object_id=object_id,
                kind=Image.Kind.LOGO,
            ).delete()

        return super().create(validated_data)
