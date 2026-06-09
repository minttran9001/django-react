# Generated manually — switch Image.file to Cloudinary URL storage

from django.db import migrations, models


def clear_local_images(apps, schema_editor):
    Image = apps.get_model("api", "Image")
    Image.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0009_seed_sports"),
    ]

    operations = [
        migrations.RunPython(clear_local_images, migrations.RunPython.noop),
        migrations.AddField(
            model_name="image",
            name="public_id",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="image",
            name="file",
            field=models.URLField(max_length=500),
        ),
    ]
