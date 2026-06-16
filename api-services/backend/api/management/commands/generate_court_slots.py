"""
Management command: generate_court_slots

Populates and extends the CourtSlot availability index.

Usage
-----
# Initial population (run once after migration):
python manage.py generate_court_slots

# Regenerate a single court (after manual schedule fix):
python manage.py generate_court_slots --court-id 42

# Use a custom horizon (default 60 days):
python manage.py generate_court_slots --days 90

# Prune slots older than today:
python manage.py generate_court_slots --prune

Cron example (daily at 01:00):
  0 1 * * * cd /app && python manage.py generate_court_slots --prune
"""

from django.core.management.base import BaseCommand

from api.utils.slot_index import extend_slots_horizon, prune_past_slots, regenerate_slots_for_court


class Command(BaseCommand):
    help = "Populate / extend the CourtSlot availability index"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=60,
            help="How many days ahead to generate slots (default: 60)",
        )
        parser.add_argument(
            "--court-id",
            type=int,
            default=None,
            dest="court_id",
            help="Regenerate slots for a specific court only (full rebuild for that court)",
        )
        parser.add_argument(
            "--prune",
            action="store_true",
            default=False,
            help="Delete past slots before extending",
        )

    def handle(self, *args, **options):
        days: int = options["days"]
        court_id: int | None = options["court_id"]
        prune: bool = options["prune"]

        if prune:
            deleted = prune_past_slots()
            self.stdout.write(f"Pruned {deleted} past slot(s).")

        if court_id is not None:
            from api.models.court import Court
            try:
                court = Court.objects.prefetch_related("schedules").get(pk=court_id)
            except Court.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"Court {court_id} not found."))
                return
            regenerate_slots_for_court(court)
            self.stdout.write(
                self.style.SUCCESS(f"Regenerated slots for court {court_id}.")
            )
            return

        created = extend_slots_horizon(days=days)
        self.stdout.write(
            self.style.SUCCESS(
                f"Extended slot horizon by {days} days — {created} new slot(s) created."
            )
        )
