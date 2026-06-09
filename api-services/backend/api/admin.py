from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from .models import CourtCenter, EmailVerificationToken, Image, Sport


class ImageInline(GenericTabularInline):
    model = Image
    extra = 1
    fields = ("url", "kind", "caption", "sort_order")


@admin.register(CourtCenter)
class CourtCenterAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "created_at")
    search_fields = ("title", "owner__email")
    fields = ("owner", "title", "description", "latitude", "longitude")
    inlines = [ImageInline]


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "content_type", "object_id", "kind", "sort_order", "created_at")
    list_filter = ("kind", "content_type")


@admin.register(Sport)
class SportAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "expires_at", "created_at")
