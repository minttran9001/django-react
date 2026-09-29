from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from api.models import Image


class ImageResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ["id", "url", "public_id"]
        read_only_fields = fields


def logo_from_prefetch(obj):
    """Uses prefetched `images`; do not call RelatedManager.filter()."""
    return next(
        (image for image in obj.images.all() if image.kind == Image.Kind.LOGO),
        None,
    )


def gallery_from_prefetch(obj):
    return [image for image in obj.images.all() if image.kind == Image.Kind.GALLERY]


class PrefetchedGalleryMixin(metaclass=serializers.SerializerMetaclass):
    """Gallery from prefetch cache, for models without a logo (e.g. Court)."""

    images = serializers.SerializerMethodField()

    def get_images(self, obj):
        return ImageResourceSerializer(gallery_from_prefetch(obj), many=True).data


class PrefetchedCenterImagesMixin(PrefetchedGalleryMixin):
    """Logo + gallery from prefetch cache. Add/remove fields via Meta.fields."""

    logo = serializers.SerializerMethodField()

    def get_logo(self, obj):
        logo = logo_from_prefetch(obj)
        return ImageResourceSerializer(logo).data if logo else None


class ImageUploadResponseSerializer(serializers.Serializer):
    images = ImageResourceSerializer(many=True)
