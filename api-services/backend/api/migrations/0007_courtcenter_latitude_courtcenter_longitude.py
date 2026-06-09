# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_remove_courtcenter_logo_image_unique_logo_per_object"),
    ]

    operations = [
        migrations.AddField(
            model_name="courtcenter",
            name="latitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="courtcenter",
            name="longitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
    ]
