from rest_framework import serializers

from .models import Attendance, Event, EventApplication


class EventSerializer(serializers.ModelSerializer):
    club_name = serializers.CharField(source="club.name", read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )
    event_type_display = serializers.CharField(
        source="get_event_type_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = Event
        fields = [
            "id",
            "club",
            "club_name",
            "title",
            "event_type",
            "event_type_display",
            "description",
            "location",
            "start_at",
            "end_at",
            "allow_application",
            "max_participants",
            "application_start_at",
            "application_end_at",
            "status",
            "status_display",
            "cancel_reason",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "club",
            "club_name",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        start_at = attrs.get("start_at", getattr(self.instance, "start_at", None))
        end_at = attrs.get("end_at", getattr(self.instance, "end_at", None))

        application_start_at = attrs.get(
            "application_start_at",
            getattr(self.instance, "application_start_at", None),
        )
        application_end_at = attrs.get(
            "application_end_at",
            getattr(self.instance, "application_end_at", None),
        )

        status = attrs.get(
            "status",
            getattr(self.instance, "status", Event.STATUS_SCHEDULED),
        )
        cancel_reason = attrs.get(
            "cancel_reason",
            getattr(self.instance, "cancel_reason", ""),
        )

        if start_at and end_at and end_at < start_at:
            raise serializers.ValidationError({
                "end_at": "종료 일시는 시작 일시보다 빠를 수 없습니다."
            })

        if (
            application_start_at
            and application_end_at
            and application_end_at < application_start_at
        ):
            raise serializers.ValidationError({
                "application_end_at": "신청 마감 일시는 신청 시작 일시보다 빠를 수 없습니다."
            })

        if status == Event.STATUS_CANCELED and not str(cancel_reason).strip():
            raise serializers.ValidationError({
                "cancel_reason": "취소된 일정은 취소 사유를 입력해야 합니다."
            })

        if status != Event.STATUS_CANCELED and str(cancel_reason).strip():
            raise serializers.ValidationError({
                "cancel_reason": "취소 상태가 아닌 일정에는 취소 사유를 입력할 수 없습니다."
            })

        return attrs


class EventApplicationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    user_real_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = EventApplication
        fields = [
            "id",
            "event",
            "user",
            "username",
            "user_real_name",
            "status",
            "status_display",
            "cancel_reason",
            "applied_at",
            "canceled_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "event",
            "user",
            "username",
            "user_real_name",
            "applied_at",
            "canceled_at",
            "created_at",
            "updated_at",
        ]

    def get_user_real_name(self, obj):
        real_name = obj.user.first_name.strip()

        if real_name:
            return real_name

        return obj.user.username


class AttendanceSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    user_real_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    checked_by_username = serializers.CharField(
        source="checked_by.username",
        read_only=True,
    )

    class Meta:
        model = Attendance
        fields = [
            "id",
            "event",
            "user",
            "username",
            "user_real_name",
            "application",
            "status",
            "status_display",
            "checked_by",
            "checked_by_username",
            "checked_at",
            "memo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "event",
            "user",
            "username",
            "user_real_name",
            "application",
            "checked_by",
            "checked_by_username",
            "checked_at",
            "created_at",
            "updated_at",
        ]

    def get_user_real_name(self, obj):
        real_name = obj.user.first_name.strip()

        if real_name:
            return real_name

        return obj.user.username