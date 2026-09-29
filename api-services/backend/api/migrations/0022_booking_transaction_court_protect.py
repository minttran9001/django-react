import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_review_courtcenter_review_average_rating_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="booking",
            name="court",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="bookings",
                to="api.court",
            ),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="court",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="transactions",
                to="api.court",
            ),
        ),
    ]
