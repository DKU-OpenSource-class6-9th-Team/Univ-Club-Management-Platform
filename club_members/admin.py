from django.contrib import admin
from .models import ClubMembership


@admin.register(ClubMembership)
class ClubMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "club",
        "role",
        "status",
        "activity_score",
        "joined_at",
    )
    list_filter = ("role", "status", "club")
    search_fields = ("user__username", "user__email", "club__name")