from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "club",
        "title",
        "event_type",
        "status",
        "start_at",
        "end_at",
        "allow_application",
        "max_participants",
        "created_by",
    )

    list_filter = (
        "event_type",
        "status",
        "allow_application",
        "club",
    )

    search_fields = (
        "title",
        "description",
        "location",
        "club__name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "기본 정보",
            {
                "fields": (
                    "club",
                    "title",
                    "event_type",
                    "description",
                    "location",
                )
            },
        ),
        (
            "일정 시간",
            {
                "fields": (
                    "start_at",
                    "end_at",
                )
            },
        ),
        (
            "참여 신청 설정",
            {
                "fields": (
                    "allow_application",
                    "max_participants",
                    "application_start_at",
                    "application_end_at",
                )
            },
        ),
        (
            "상태 관리",
            {
                "fields": (
                    "status",
                    "cancel_reason",
                )
            },
        ),
        (
            "생성 정보",
            {
                "fields": (
                    "created_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )