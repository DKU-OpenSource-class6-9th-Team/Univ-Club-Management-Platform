from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Event(models.Model):
    EVENT_TYPE_REGULAR = "regular"
    EVENT_TYPE_ACTIVITY = "activity"
    EVENT_TYPE_RECRUITMENT = "recruitment"
    EVENT_TYPE_INTERVIEW = "interview"
    EVENT_TYPE_PROJECT = "project"
    EVENT_TYPE_ETC = "etc"

    EVENT_TYPE_CHOICES = [
        (EVENT_TYPE_REGULAR, "정기 모임"),
        (EVENT_TYPE_ACTIVITY, "행사"),
        (EVENT_TYPE_RECRUITMENT, "모집 일정"),
        (EVENT_TYPE_INTERVIEW, "면접 일정"),
        (EVENT_TYPE_PROJECT, "프로젝트 일정"),
        (EVENT_TYPE_ETC, "기타"),
    ]

    STATUS_SCHEDULED = "scheduled"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELED = "canceled"

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "예정"),
        (STATUS_COMPLETED, "완료"),
        (STATUS_CANCELED, "취소"),
    ]

    club = models.ForeignKey(
        "clubs.Club",
        on_delete=models.CASCADE,
        related_name="events",
    )

    title = models.CharField(
        max_length=100,
        verbose_name="일정명",
    )

    event_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPE_CHOICES,
        default=EVENT_TYPE_REGULAR,
        verbose_name="일정 유형",
    )

    description = models.TextField(
        blank=True,
        verbose_name="일정 설명",
    )

    location = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="장소",
    )

    start_at = models.DateTimeField(
        verbose_name="시작 일시",
    )

    end_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="종료 일시",
    )

    allow_application = models.BooleanField(
        default=True,
        verbose_name="참여 신청 가능 여부",
    )

    activity_score_enabled = models.BooleanField(
        default=True,
        verbose_name="활동 점수 반영 여부",
    )

    max_participants = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="최대 참여 인원",
    )

    application_start_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="신청 시작 일시",
    )

    application_end_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="신청 마감 일시",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_SCHEDULED,
        verbose_name="일정 상태",
    )

    cancel_reason = models.TextField(
        blank=True,
        verbose_name="취소 사유",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_events",
        verbose_name="생성자",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="생성일",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="수정일",
    )

    class Meta:
        db_table = "events_event"
        ordering = ["-start_at", "-created_at"]
        verbose_name = "일정"
        verbose_name_plural = "일정 목록"

    def __str__(self):
        return f"[{self.club.name}] {self.title}"

    def clean(self):
        if self.end_at and self.end_at < self.start_at:
            raise ValidationError({
                "end_at": "종료 일시는 시작 일시보다 빠를 수 없습니다."
            })

        if (
            self.application_start_at
            and self.application_end_at
            and self.application_end_at < self.application_start_at
        ):
            raise ValidationError({
                "application_end_at": "신청 마감 일시는 신청 시작 일시보다 빠를 수 없습니다."
            })

        if self.status == self.STATUS_CANCELED and not self.cancel_reason.strip():
            raise ValidationError({
                "cancel_reason": "취소된 일정은 취소 사유를 입력해야 합니다."
            })

        if self.status != self.STATUS_CANCELED and self.cancel_reason.strip():
            raise ValidationError({
                "cancel_reason": "취소 상태가 아닌 일정에는 취소 사유를 입력할 수 없습니다."
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class EventApplication(models.Model):
    STATUS_APPLIED = "applied"
    STATUS_CANCELED = "canceled"

    STATUS_CHOICES = [
        (STATUS_APPLIED, "신청"),
        (STATUS_CANCELED, "취소"),
    ]

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="applications",
        verbose_name="일정",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_applications",
        verbose_name="신청자",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_APPLIED,
        verbose_name="신청 상태",
    )

    cancel_reason = models.TextField(
        blank=True,
        verbose_name="신청 취소 사유",
    )

    applied_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="신청 일시",
    )

    canceled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="취소 일시",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="생성일",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="수정일",
    )

    class Meta:
        db_table = "events_event_application"
        ordering = ["-applied_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "user"],
                name="unique_event_application_per_user",
            )
        ]
        verbose_name = "일정 참여 신청"
        verbose_name_plural = "일정 참여 신청 목록"

    def __str__(self):
        return f"{self.event.title} - {self.user.username} ({self.get_status_display()})"


class Attendance(models.Model):
    STATUS_PRESENT = "present"
    STATUS_LATE = "late"
    STATUS_PRE_CANCELED = "pre_canceled"
    STATUS_NO_SHOW = "no_show"

    STATUS_CHOICES = [
        (STATUS_PRESENT, "참석"),
        (STATUS_LATE, "지각"),
        (STATUS_PRE_CANCELED, "사전 취소"),
        (STATUS_NO_SHOW, "무단 불참"),
    ]

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="attendances",
        verbose_name="일정",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_attendances",
        verbose_name="회원",
    )

    application = models.OneToOneField(
        EventApplication,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance",
        verbose_name="참여 신청 정보",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PRESENT,
        verbose_name="출석 상태",
    )

    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checked_attendances",
        verbose_name="출석 체크한 운영진",
    )

    checked_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="출석 체크 일시",
    )

    memo = models.TextField(
        blank=True,
        verbose_name="출석 메모",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="생성일",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="수정일",
    )

    class Meta:
        db_table = "events_attendance"
        ordering = ["event", "user"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "user"],
                name="unique_attendance_per_event_user",
            )
        ]
        verbose_name = "출석"
        verbose_name_plural = "출석 목록"

    def __str__(self):
        return f"{self.event.title} - {self.user.username} ({self.get_status_display()})"