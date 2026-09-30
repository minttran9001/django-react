import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0034_remove_courtslot_available_slots_by_date_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="conversation",
            name="last_message_sender",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="last_message_sender",
                to="api.member",
            ),
        ),
    ]
