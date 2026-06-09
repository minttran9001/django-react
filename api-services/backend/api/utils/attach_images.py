from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from api.models import Court, CourtCenter, Image


def get_pending_images(owner, image_ids: list[int]) -> list[Image]:
    if not image_ids:
        return []

    unique_ids = list(dict.fromkeys(image_ids))
    images = list(
        Image.objects.filter(
            id__in=unique_ids,
            owner=owner,
            content_type__isnull=True,
        )
    )

    if len(images) != len(unique_ids):
        raise serializers.ValidationError(
            "One or more images are invalid or already in use."
        )

    images_by_id = {image.id: image for image in images}
    return [images_by_id[image_id] for image_id in unique_ids]


def resolve_owner_image(
    owner,
    image_id: int,
    *,
    content_type=None,
    object_id: int | None = None,
) -> Image:
    try:
        image = Image.objects.get(id=image_id, owner=owner)
    except Image.DoesNotExist as exc:
        raise serializers.ValidationError(
            "One or more images are invalid or already in use."
        ) from exc

    if image.content_type_id is None:
        return image

    if (
        content_type is not None
        and object_id is not None
        and image.content_type_id == content_type.id
        and image.object_id == object_id
    ):
        return image

    raise serializers.ValidationError(
        "One or more images are invalid or already in use."
    )


def attach_logo(content_type, object_id: int, owner, logo_id: int | None) -> None:
    if logo_id is None:
        return

    logo = resolve_owner_image(
        owner,
        logo_id,
        content_type=content_type,
        object_id=object_id,
    )
    Image.objects.filter(
        content_type=content_type,
        object_id=object_id,
        kind=Image.Kind.LOGO,
    ).exclude(id=logo_id).delete()
    logo.content_type = content_type
    logo.object_id = object_id
    logo.kind = Image.Kind.LOGO
    logo.sort_order = 0
    logo.save(update_fields=["content_type", "object_id", "kind", "sort_order"])


def attach_gallery(content_type, object_id: int, owner, image_ids: list[int]) -> None:
    for sort_order, image in enumerate(get_pending_images(owner, image_ids)):
        image.content_type = content_type
        image.object_id = object_id
        image.kind = Image.Kind.GALLERY
        image.sort_order = sort_order
        image.save(update_fields=["content_type", "object_id", "kind", "sort_order"])


def sync_gallery(
    content_type,
    object_id: int,
    owner,
    image_ids: list[int],
) -> None:
    Image.objects.filter(
        content_type=content_type,
        object_id=object_id,
        kind=Image.Kind.GALLERY,
    ).exclude(id__in=image_ids).delete()

    for sort_order, image_id in enumerate(image_ids):
        image = resolve_owner_image(
            owner,
            image_id,
            content_type=content_type,
            object_id=object_id,
        )
        image.content_type = content_type
        image.object_id = object_id
        image.kind = Image.Kind.GALLERY
        image.sort_order = sort_order
        image.save(update_fields=["content_type", "object_id", "kind", "sort_order"])


def attach_center_images(
    center: CourtCenter,
    owner,
    *,
    logo_id: int | None = None,
    image_ids: list[int] | None = None,
) -> None:
    content_type = ContentType.objects.get_for_model(CourtCenter)
    attach_logo(content_type, center.id, owner, logo_id)
    attach_gallery(content_type, center.id, owner, image_ids or [])


def attach_court_images(
    court: Court,
    owner,
    *,
    image_ids: list[int] | None = None,
) -> None:
    content_type = ContentType.objects.get_for_model(Court)
    attach_gallery(content_type, court.id, owner, image_ids or [])


def sync_center_images(
    center: CourtCenter,
    owner,
    *,
    logo_id: int | None = None,
    image_ids: list[int] | None = None,
) -> None:
    content_type = ContentType.objects.get_for_model(CourtCenter)

    if logo_id is not None:
        attach_logo(content_type, center.id, owner, logo_id)

    if image_ids is not None:
        sync_gallery(content_type, center.id, owner, image_ids)


def sync_court_images(
    court: Court,
    owner,
    *,
    image_ids: list[int] | None = None,
) -> None:
    if image_ids is None:
        return

    content_type = ContentType.objects.get_for_model(Court)
    sync_gallery(content_type, court.id, owner, image_ids)


def sync_courts(center: CourtCenter, courts_data: list[dict], owner) -> None:
    submitted_ids: set[int] = set()

    for court_data in courts_data:
        court_image_ids = court_data.pop("image_ids", [])
        court_id = court_data.pop("id", None)

        if court_id:
            court = Court.objects.get(id=court_id, center=center)
            for field, value in court_data.items():
                setattr(court, field, value)
            court.save()
        else:
            court = Court.objects.create(center=center, **court_data)

        submitted_ids.add(court.id)
        sync_court_images(court, owner, image_ids=court_image_ids)

    center.courts.exclude(id__in=submitted_ids).delete()
