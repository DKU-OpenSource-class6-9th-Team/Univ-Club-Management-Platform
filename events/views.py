from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from club_members.models import ClubMembership
from clubs.models import Club

from .models import Attendance, Event, EventApplication
from .serializers import (
    AttendanceSerializer,
    EventApplicationSerializer,
    EventSerializer,
)


User = get_user_model()


EVENT_MANAGER_ROLES = {
    "president",
    "vice_president",
    "executive",
}


def get_club_membership(user, club_id):
    if not user.is_authenticated:
        return None

    return (
        ClubMembership.objects
        .filter(user=user, club_id=club_id)
        .select_related("club", "user")
        .first()
    )


def is_event_manager(user, club_id):
    membership = get_club_membership(user, club_id)

    if membership is None:
        return False

    return membership.role in EVENT_MANAGER_ROLES


def is_club_member(user, club_id):
    membership = get_club_membership(user, club_id)

    return membership is not None


def require_login(request):
    if not request.user.is_authenticated:
        return Response(
            {"message": "로그인이 필요합니다."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return None


def require_event_manager(request, club_id):
    login_error = require_login(request)

    if login_error is not None:
        return login_error

    if not is_event_manager(request.user, club_id):
        return Response(
            {"message": "일정 관리 권한이 없습니다."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return None


def get_event_or_404(club_id, event_id):
    return get_object_or_404(
        Event.objects.select_related("club", "created_by"),
        id=event_id,
        club_id=club_id,
    )


def is_event_application_available(event):
    now = timezone.now()

    if event.status != Event.STATUS_SCHEDULED:
        return False, "예정 상태의 일정에만 참여 신청할 수 있습니다."

    if not event.allow_application:
        return False, "이 일정은 참여 신청을 받지 않습니다."

    if event.application_start_at and now < event.application_start_at:
        return False, "아직 참여 신청 기간이 시작되지 않았습니다."

    if event.application_end_at and now > event.application_end_at:
        return False, "참여 신청 기간이 마감되었습니다."

    if event.max_participants:
        applied_count = event.applications.filter(
            status=EventApplication.STATUS_APPLIED,
        ).count()

        if applied_count >= event.max_participants:
            return False, "참여 가능 인원이 마감되었습니다."

    return True, ""


def calculate_event_stats(event):
    applications = EventApplication.objects.filter(event=event)
    applied_applications = applications.filter(
        status=EventApplication.STATUS_APPLIED,
    )
    canceled_applications = applications.filter(
        status=EventApplication.STATUS_CANCELED,
    )

    attendances = Attendance.objects.filter(event=event)

    present_count = attendances.filter(
        status=Attendance.STATUS_PRESENT,
    ).count()
    late_count = attendances.filter(
        status=Attendance.STATUS_LATE,
    ).count()
    pre_canceled_count = attendances.filter(
        status=Attendance.STATUS_PRE_CANCELED,
    ).count()
    no_show_count = attendances.filter(
        status=Attendance.STATUS_NO_SHOW,
    ).count()

    applied_count = applied_applications.count()
    attended_count = present_count + late_count

    attendance_rate = 0
    no_show_rate = 0

    if applied_count > 0:
        attendance_rate = round((attended_count / applied_count) * 100, 1)
        no_show_rate = round((no_show_count / applied_count) * 100, 1)

    return {
        "event_id": event.id,
        "event_title": event.title,
        "application": {
            "total_count": applications.count(),
            "applied_count": applied_count,
            "canceled_count": canceled_applications.count(),
        },
        "attendance": {
            "total_checked_count": attendances.count(),
            "present_count": present_count,
            "late_count": late_count,
            "pre_canceled_count": pre_canceled_count,
            "no_show_count": no_show_count,
            "attended_count": attended_count,
        },
        "rates": {
            "attendance_rate": attendance_rate,
            "no_show_rate": no_show_rate,
        },
    }


class EventListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id):
        get_object_or_404(Club, id=club_id)

        events = (
            Event.objects
            .filter(club_id=club_id)
            .select_related("club", "created_by")
            .order_by("-start_at", "-created_at")
        )

        event_type = request.query_params.get("event_type", "").strip()
        status_value = request.query_params.get("status", "").strip()
        search = request.query_params.get("search", "").strip()

        if event_type:
            events = events.filter(event_type=event_type)

        if status_value:
            events = events.filter(status=status_value)

        if search:
            events = events.filter(title__icontains=search)

        serializer = EventSerializer(events, many=True)

        return Response(
            {
                "results": serializer.data,
                "count": events.count(),
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, club_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        club = get_object_or_404(Club, id=club_id)

        serializer = EventSerializer(data=request.data)

        if serializer.is_valid():
            event = serializer.save(
                club=club,
                created_by=request.user,
            )

            response_serializer = EventSerializer(event)

            return Response(
                {
                    "message": "일정이 등록되었습니다.",
                    "event": response_serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EventDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, club_id, event_id):
        return get_event_or_404(club_id, event_id)

    def get(self, request, club_id, event_id):
        event = self.get_object(club_id, event_id)
        serializer = EventSerializer(event)

        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, club_id, event_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        event = self.get_object(club_id, event_id)

        serializer = EventSerializer(
            event,
            data=request.data,
            partial=True,
        )

        if serializer.is_valid():
            event = serializer.save()

            response_serializer = EventSerializer(event)

            return Response(
                {
                    "message": "일정이 수정되었습니다.",
                    "event": response_serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, club_id, event_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        event = self.get_object(club_id, event_id)
        event.delete()

        return Response(
            {"message": "일정이 삭제되었습니다."},
            status=status.HTTP_200_OK,
        )


class MyEventRoleView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id):
        login_error = require_login(request)

        if login_error is not None:
            return login_error

        membership = get_club_membership(request.user, club_id)

        if membership is None:
            return Response(
                {
                    "role": None,
                    "role_display": "비회원",
                    "can_manage_events": False,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "role": membership.role,
                "role_display": membership.get_role_display(),
                "can_manage_events": membership.role in EVENT_MANAGER_ROLES,
            },
            status=status.HTTP_200_OK,
        )


class EventApplyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, club_id, event_id):
        login_error = require_login(request)

        if login_error is not None:
            return login_error

        if not is_club_member(request.user, club_id):
            return Response(
                {"message": "동아리원만 참여 신청할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        event = get_event_or_404(club_id, event_id)

        available, message = is_event_application_available(event)

        if not available:
            return Response(
                {"message": message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application, created = EventApplication.objects.get_or_create(
            event=event,
            user=request.user,
            defaults={
                "status": EventApplication.STATUS_APPLIED,
            },
        )

        if not created:
            if application.status == EventApplication.STATUS_APPLIED:
                return Response(
                    {"message": "이미 참여 신청한 일정입니다."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            application.status = EventApplication.STATUS_APPLIED
            application.cancel_reason = ""
            application.canceled_at = None
            application.save()

        serializer = EventApplicationSerializer(application)

        return Response(
            {
                "message": "참여 신청이 완료되었습니다.",
                "application": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class EventApplicationCancelView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, club_id, event_id):
        login_error = require_login(request)

        if login_error is not None:
            return login_error

        event = get_event_or_404(club_id, event_id)

        if event.status != Event.STATUS_SCHEDULED:
            return Response(
                {"message": "예정 상태의 일정만 신청 취소할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application = EventApplication.objects.filter(
            event=event,
            user=request.user,
        ).first()

        if application is None or application.status != EventApplication.STATUS_APPLIED:
            return Response(
                {"message": "취소할 참여 신청 내역이 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cancel_reason = request.data.get("cancel_reason", "").strip()

        application.status = EventApplication.STATUS_CANCELED
        application.cancel_reason = cancel_reason
        application.canceled_at = timezone.now()
        application.save()

        serializer = EventApplicationSerializer(application)

        return Response(
            {
                "message": "참여 신청이 취소되었습니다.",
                "application": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class MyEventApplicationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id, event_id):
        login_error = require_login(request)

        if login_error is not None:
            return login_error

        event = get_event_or_404(club_id, event_id)

        application = EventApplication.objects.filter(
            event=event,
            user=request.user,
        ).first()

        if application is None:
            return Response(
                {
                    "has_application": False,
                    "application": None,
                },
                status=status.HTTP_200_OK,
            )

        serializer = EventApplicationSerializer(application)

        return Response(
            {
                "has_application": application.status == EventApplication.STATUS_APPLIED,
                "application": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class EventApplicationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id, event_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        event = get_event_or_404(club_id, event_id)

        applications = (
            EventApplication.objects
            .filter(event=event)
            .select_related("user")
            .order_by("-applied_at")
        )

        serializer = EventApplicationSerializer(applications, many=True)

        return Response(
            {
                "event_id": event.id,
                "event_title": event.title,
                "count": applications.count(),
                "applied_count": applications.filter(
                    status=EventApplication.STATUS_APPLIED,
                ).count(),
                "canceled_count": applications.filter(
                    status=EventApplication.STATUS_CANCELED,
                ).count(),
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class EventAttendanceListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id, event_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        event = get_event_or_404(club_id, event_id)

        attendances = (
            Attendance.objects
            .filter(event=event)
            .select_related("user", "application", "checked_by")
            .order_by("user__username")
        )

        serializer = AttendanceSerializer(attendances, many=True)

        return Response(
            {
                "event_id": event.id,
                "event_title": event.title,
                "count": attendances.count(),
                "results": serializer.data,
                "stats": calculate_event_stats(event),
            },
            status=status.HTTP_200_OK,
        )


class EventAttendanceCheckView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, club_id, event_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        event = get_event_or_404(club_id, event_id)

        user_id = request.data.get("user_id")
        attendance_status = request.data.get("status")
        memo = request.data.get("memo", "").strip()

        if not user_id:
            return Response(
                {"message": "출석 체크할 회원 ID가 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_statuses = {
            Attendance.STATUS_PRESENT,
            Attendance.STATUS_LATE,
            Attendance.STATUS_PRE_CANCELED,
            Attendance.STATUS_NO_SHOW,
        }

        if attendance_status not in valid_statuses:
            return Response(
                {"message": "올바르지 않은 출석 상태입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user = get_object_or_404(User, id=user_id)

        if not is_club_member(target_user, club_id):
            return Response(
                {"message": "해당 사용자는 이 동아리의 동아리원이 아닙니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application = EventApplication.objects.filter(
            event=event,
            user=target_user,
        ).first()

        attendance, created = Attendance.objects.get_or_create(
            event=event,
            user=target_user,
            defaults={
                "application": application,
                "status": attendance_status,
                "checked_by": request.user,
                "checked_at": timezone.now(),
                "memo": memo,
            },
        )

        if not created:
            attendance.application = application
            attendance.status = attendance_status
            attendance.checked_by = request.user
            attendance.checked_at = timezone.now()
            attendance.memo = memo
            attendance.save()

        serializer = AttendanceSerializer(attendance)

        return Response(
            {
                "message": "출석 상태가 저장되었습니다.",
                "attendance": serializer.data,
                "stats": calculate_event_stats(event),
            },
            status=status.HTTP_200_OK,
        )


class EventStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id, event_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        event = get_event_or_404(club_id, event_id)

        return Response(
            calculate_event_stats(event),
            status=status.HTTP_200_OK,
        )


class EventNoShowListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id, event_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        event = get_event_or_404(club_id, event_id)

        no_show_attendances = (
            Attendance.objects
            .filter(
                event=event,
                status=Attendance.STATUS_NO_SHOW,
            )
            .select_related("user", "application", "checked_by")
            .order_by("user__username")
        )

        serializer = AttendanceSerializer(no_show_attendances, many=True)

        return Response(
            {
                "event_id": event.id,
                "event_title": event.title,
                "count": no_show_attendances.count(),
                "results": serializer.data,
                "stats": calculate_event_stats(event),
            },
            status=status.HTTP_200_OK,
        )