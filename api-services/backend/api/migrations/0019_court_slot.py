from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_transaction_booking_transaction'),
    ]

    operations = [
        migrations.CreateModel(
            name='CourtSlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('is_available', models.BooleanField(default=True)),
                ('court', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='slots',
                    to='api.court',
                )),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='courtslot',
            unique_together={('court', 'date', 'start_time')},
        ),
        migrations.AddIndex(
            model_name='courtslot',
            index=models.Index(fields=['court', 'date', 'is_available'], name='api_courtsl_court_i_date_is_avail_idx'),
        ),
        migrations.AddIndex(
            model_name='courtslot',
            index=models.Index(fields=['date', 'is_available'], name='api_courtsl_date_is_avail_idx'),
        ),
    ]
