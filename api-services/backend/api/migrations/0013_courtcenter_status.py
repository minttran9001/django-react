from django.db import migrations, models


def publish_existing_centers(apps, schema_editor):
    CourtCenter = apps.get_model("api", "CourtCenter")
    CourtCenter.objects.all().update(status="published")


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0012_image_sharetribe_uploads"),
    ]

    operations = [
        migrations.AddField(
            model_name="courtcenter",
            name="status",
            field=models.CharField(
                choices=[("draft", "Draft"), ("published", "Published")],
                default="draft",
                max_length=20,
            ),
        ),
        migrations.RunPython(publish_existing_centers, migrations.RunPython.noop),
    ]
