from django.db import models
from django.contrib.auth.models import User
from .court_center import CourtCenter
from .transaction import Transaction
from django.core.validators import MinValueValidator, MaxValueValidator

class Review(models.Model):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['reviewer', 'transaction'], name='unique_review_per_transaction')
        ]

    def __str__(self):
        return f"{self.reviewer.email} — {self.court_center.title} — {self.rating}"

    @property
    def court_center(self):
        return self.transaction.court_center