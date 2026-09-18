from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_review_courtcenter_review_average_rating_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="transaction",
            name="timezone",
            field=models.CharField(default="UTC", max_length=64),
        ),
    ]
