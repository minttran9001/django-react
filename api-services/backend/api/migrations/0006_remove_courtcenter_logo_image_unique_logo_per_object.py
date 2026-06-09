# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_courtcenter_logo"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="courtcenter",
            name="logo",
        ),
        migrations.AddConstraint(
            model_name="image",
            constraint=models.UniqueConstraint(
                condition=models.Q(("kind", "logo")),
                fields=("content_type", "object_id"),
                name="unique_logo_per_object",
            ),
        ),
    ]
