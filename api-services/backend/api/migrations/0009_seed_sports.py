from django.db import migrations


def seed_sports(apps, schema_editor):
    Sport = apps.get_model("api", "Sport")
    sports = [
        {"name": "Tennis", "code": "tennis"},
        {"name": "Badminton", "code": "badminton"},
        {"name": "Basketball", "code": "basketball"},
        {"name": "Football", "code": "football"},
        {"name": "Volleyball", "code": "volleyball"},
        {"name": "Pickleball", "code": "pickleball"},
    ]
    for sport in sports:
        Sport.objects.get_or_create(code=sport["code"], defaults=sport)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0008_booking_court_courtschedule_courtscheduleexception_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_sports, migrations.RunPython.noop),
    ]
