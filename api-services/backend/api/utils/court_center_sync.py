from rest_framework import serializers

from api.models import Court, CourtCenter, CourtSchedule


def validate_publish(center: CourtCenter) -> None:
    errors: dict[str, list[str]] = {}

    if not center.title.strip():
        errors["title"] = ["Title is required."]
    if not center.description.strip():
        errors["description"] = ["Description is required."]
    if not center.address:
        errors["address"] = ["Address is required."]
    if center.latitude is None:
        errors["latitude"] = ["Latitude is required."]
    if center.longitude is None:
        errors["longitude"] = ["Longitude is required."]

    courts = list(center.courts.all())
    if not courts:
        errors["courts"] = ["Add at least one court."]

    for court in courts:
        if not court.schedules.exists():
            errors.setdefault("schedules", []).append(
                f'Court "{court.title}" must have at least one availability slot.'
            )

    if errors:
        raise serializers.ValidationError(errors)


def sync_court_schedules(court: Court, schedules_data: list[dict]) -> None:
    submitted_ids: set[int] = set()

    for schedule_data in schedules_data:
        schedule_id = schedule_data.pop("id", None)

        if schedule_id:
            schedule = CourtSchedule.objects.get(id=schedule_id, court=court)
            for field, value in schedule_data.items():
                setattr(schedule, field, value)
            schedule.save()
        else:
            schedule = CourtSchedule.objects.create(court=court, **schedule_data)

        submitted_ids.add(schedule.id)

    court.schedules.exclude(id__in=submitted_ids).delete()


def sync_center_schedules(center: CourtCenter, courts_data: list[dict]) -> None:
    for court_payload in courts_data:
        court_id = court_payload.get("id")
        schedules_data = court_payload.get("schedules", [])

        if court_id is None:
            raise serializers.ValidationError(
                {"courts": "Each court entry must include an id."}
            )

        court = Court.objects.get(id=court_id, center=center)
        sync_court_schedules(court, schedules_data)
