from django.contrib import admin

from .models import Attendance, Event, EventApplication


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

@admin.register(EventApplication)
class EventApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "event",
        "user",
        "status",
        "applied_at",
        "canceled_at",
    )

    list_filter = (
        "status",
        "event",
    )

    search_fields = (
        "event__title",
        "user__username",
    )

    readonly_fields = (
        "applied_at",
        "created_at",
        "updated_at",
    )


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "event",
        "user",
        "status",
        "checked_by",
        "checked_at",
    )

    list_filter = (
        "status",
        "event",
    )

    search_fields = (
        "event__title",
        "user__username",
        "checked_by__username",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )