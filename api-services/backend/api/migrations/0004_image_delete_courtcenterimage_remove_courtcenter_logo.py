# Generated manually — replace CourtCenterImage with generic Image model

import api.models.image
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contenttypes", "0002_remove_content_type_name"),
        ("api", "0003_sport_courtcenter_courtcenterimage"),
    ]

    operations = [
        migrations.CreateModel(
            name="Image",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("object_id", models.PositiveBigIntegerField()),
                ("file", models.ImageField(upload_to=api.models.image.image_upload_to)),
                (
                    "kind",
                    models.CharField(
                        choices=[("logo", "Logo"), ("gallery", "Gallery")],
                        default="gallery",
                        max_length=20,
                    ),
                ),
                ("caption", models.CharField(blank=True, max_length=255)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "content_type",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="contenttypes.contenttype"),
                ),
            ],
            options={
                "ordering": ["sort_order", "id"],
                "indexes": [models.Index(fields=["content_type", "object_id"], name="api_image_content_8a1f2d_idx")],
            },
        ),
        migrations.DeleteModel(
            name="CourtCenterImage",
        ),
        migrations.RemoveField(
            model_name="courtcenter",
            name="logo",
        ),
    ]
