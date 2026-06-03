from django.contrib import admin
from .models import ClubMembership, MemberRelationObservation


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

@admin.register(MemberRelationObservation)
class MemberRelationObservationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "club",
        "from_member",
        "to_member",
        "tag",
        "created_by",
        "updated_at",
    )
    list_filter = ("club", "tag")
    search_fields = (
        "club__name",
        "from_member__user__username",
        "from_member__user__first_name",
        "to_member__user__username",
        "to_member__user__first_name",
        "memo",
    )