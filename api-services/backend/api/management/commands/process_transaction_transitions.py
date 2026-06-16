"""
Management command: process_transaction_transitions

Runs system-triggered transaction state changes:
  - PENDING_PAYMENT -> PAYMENT_EXPIRED after 15 minutes (releases bookings + slots)
  - CONFIRMED -> COMPLETED after the last booked slot ends (payout stub)

Schedule via cron every 1–5 minutes — see scripts/cron/crontab.example.
"""

from django.core.management.base import BaseCommand

from api.utils.transaction_scheduler import process_due_system_transitions


class Command(BaseCommand):
    help = "Run due system transaction transitions (expire payment, complete booking)"

    def handle(self, *args, **options):
        result = process_due_system_transitions()

        if result["expired"]:
            self.stdout.write(
                self.style.WARNING(f"Expired {result['expired']} pending payment(s).")
            )
        if result["completed"]:
            self.stdout.write(
                self.style.SUCCESS(f"Completed {result['completed']} transaction(s).")
            )
        if not result["expired"] and not result["completed"] and not result["errors"]:
            self.stdout.write("No due system transitions.")

        for error in result["errors"]:
            self.stderr.write(self.style.ERROR(error))
