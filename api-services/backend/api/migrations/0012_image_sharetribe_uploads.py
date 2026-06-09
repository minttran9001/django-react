from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


def clear_images(apps, schema_editor):
    Image = apps.get_model("api", "Image")
    Image.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0011_merge_0010_courtcenter_address_0010_image_cloudinary"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(clear_images, migrations.RunPython.noop),
        migrations.RenameField(
            model_name="image",
            old_name="file",
            new_name="url",
        ),
        migrations.AddField(
            model_name="image",
            name="owner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="uploaded_images",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="image",
            name="content_type",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="contenttypes.contenttype",
            ),
        ),
        migrations.AlterField(
            model_name="image",
            name="kind",
            field=models.CharField(
                blank=True,
                choices=[("logo", "Logo"), ("gallery", "Gallery")],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="image",
            name="object_id",
            field=models.PositiveBigIntegerField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="image",
            index=models.Index(
                fields=["owner", "content_type"],
                name="api_image_owner_c_6d8f1a_idx",
            ),
        ),
    ]
