# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_image_delete_courtcenterimage_remove_courtcenter_logo"),
    ]

    operations = [
        migrations.AddField(
            model_name="courtcenter",
            name="logo",
            field=models.ImageField(blank=True, null=True, upload_to="court_centers/logos/"),
        ),
    ]
