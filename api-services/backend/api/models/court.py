from django.db import models
from .sport import Sport
from .court_center import CourtCenter
from .image import Image
from django.contrib.contenttypes.fields import GenericRelation

class Court(models.Model):
    sport = models.ForeignKey(Sport, on_delete=models.CASCADE, related_name="courts")
    center = models.ForeignKey(CourtCenter, on_delete=models.CASCADE, related_name="courts")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price_per_hour = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_currency = models.CharField(max_length=3, default="VND")
    images = GenericRelation(Image, related_query_name="court")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["center_id","sport_id","-created_at"]), #default index for center, sport and created_at
        ]
    
    def __str__(self):
        return self.title

    @property
    def gallery(self):
        return self.images.filter(kind=Image.Kind.GALLERY)