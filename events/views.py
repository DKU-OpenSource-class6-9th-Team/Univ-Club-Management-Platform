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
    
def build_event_evaluation(stats):
    applied_count = stats["application"]["applied_count"]
    attendance_rate = stats["rates"]["attendance_rate"]
    no_show_rate = stats["rates"]["no_show_rate"]
    no_show_count = stats["attendance"]["no_show_count"]
    pre_canceled_count = stats["attendance"]["pre_canceled_count"]
    total_checked_count = stats["attendance"]["total_checked_count"]
    unchecked_count = max(applied_count - total_checked_count, 0)

    recommendations = []

    if applied_count == 0:
        return {
            "operation_level": "데이터 부족",
            "level_code": "empty",
            "summary": "참여 신청 데이터가 없어 일정 운영 상태를 판단하기 어렵습니다.",
            "recommendations": [
                "다음 일정에서는 참여 신청을 활성화해 운영 데이터를 확보하는 것이 좋습니다.",
                "일정 공지와 신청 마감 시간을 명확히 안내하는 것이 좋습니다.",
            ],
            "unchecked_count": 0,
        }

    if unchecked_count > 0:
        recommendations.append(
            f"아직 출석 체크가 완료되지 않은 신청자가 {unchecked_count}명 있습니다."
        )

    if no_show_count > 0:
        recommendations.append(
            "무단 불참 회원에게 불참 사유를 확인하고 다음 일정 전 리마인드를 강화하는 것이 좋습니다."
        )

    if pre_canceled_count > 0:
        recommendations.append(
            "사전 취소 인원이 발생했으므로 일정 시간대나 진행 방식에 부담이 있었는지 확인해보는 것이 좋습니다."
        )

    if attendance_rate >= 90 and no_show_rate <= 5:
        operation_level = "우수"
        level_code = "excellent"
        summary = "참석률이 매우 높고 노쇼율이 낮아 일정 운영이 안정적으로 이루어졌습니다."
        recommendations.append("현재 일정 운영 방식을 우수 사례로 기록해도 좋습니다.")
    elif attendance_rate >= 75 and no_show_rate <= 15:
        operation_level = "양호"
        level_code = "good"
        summary = "전반적으로 일정 운영은 양호하지만 일부 개선 여지가 있습니다."
        recommendations.append("일정 전날 공지와 참여자 확인을 유지하면 안정적인 운영이 가능합니다.")
    elif attendance_rate >= 50 and no_show_rate <= 30:
        operation_level = "주의"
        level_code = "warning"
        summary = "참석률이나 노쇼율에서 관리가 필요한 신호가 보입니다."
        recommendations.append("참여 신청 후 실제 참석까지 이어지도록 일정 전 리마인드와 참석 의사 재확인이 필요합니다.")
    else:
        operation_level = "위험"
        level_code = "danger"
        summary = "참석률이 낮거나 노쇼율이 높아 일정 운영 방식 점검이 필요합니다."
        recommendations.append("일정 시간, 장소, 공지 방식, 참여 부담을 전반적으로 재검토하는 것이 좋습니다.")

    if not recommendations:
        recommendations.append("현재 일정 운영 상태를 유지하면서 참여자 피드백을 수집해보는 것이 좋습니다.")

    return {
        "operation_level": operation_level,
        "level_code": level_code,
        "summary": summary,
        "recommendations": recommendations,
        "unchecked_count": unchecked_count,
    }


def build_event_report(event):
    stats = calculate_event_stats(event)
    evaluation = build_event_evaluation(stats)

    return {
        "event": {
            "id": event.id,
            "title": event.title,
            "event_type": event.event_type,
            "event_type_display": event.get_event_type_display(),
            "status": event.status,
            "status_display": event.get_status_display(),
            "start_at": event.start_at,
            "end_at": event.end_at,
            "location": event.location,
            "is_final_report": event.status == Event.STATUS_COMPLETED,
        },
        "application": stats["application"],
        "attendance": stats["attendance"],
        "rates": stats["rates"],
        "evaluation": evaluation,
        "satisfaction": {
            "status": "not_linked",
            "average_score": None,
            "response_count": 0,
            "message": "일정 만족도 조사는 추후 별도 만족도 조사 페이지와 연동 예정입니다.",
        },
    }


class EventReportView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id, event_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        event = get_event_or_404(club_id, event_id)

        return Response(
            build_event_report(event),
            status=status.HTTP_200_OK,
        )

def get_user_real_name(user):
    real_name = (user.first_name or "").strip()

    if real_name:
        return real_name

    profile = getattr(user, "profile", None)

    if profile and getattr(profile, "nickname", None):
        return profile.nickname

    return user.username


def get_latest_activity_at(applications, attendances):
    latest_values = []

    for application in applications:
        if application.applied_at:
            latest_values.append(application.applied_at)

        if application.canceled_at:
            latest_values.append(application.canceled_at)

    for attendance in attendances:
        if attendance.checked_at:
            latest_values.append(attendance.checked_at)

        if attendance.created_at:
            latest_values.append(attendance.created_at)

    if not latest_values:
        return None

    return max(latest_values)


def build_member_activity_summary(membership, total_event_count):
    user = membership.user

    applications = list(
        EventApplication.objects
        .filter(
            event__club_id=membership.club_id,
            user=user,
        )
        .select_related("event")
        .order_by("-applied_at")
    )

    attendances = list(
        Attendance.objects
        .filter(
            event__club_id=membership.club_id,
            user=user,
        )
        .select_related("event", "checked_by")
        .order_by("-created_at")
    )

    applied_count = sum(
        1 for application in applications
        if application.status == EventApplication.STATUS_APPLIED
    )
    canceled_count = sum(
        1 for application in applications
        if application.status == EventApplication.STATUS_CANCELED
    )

    present_count = sum(
        1 for attendance in attendances
        if attendance.status == Attendance.STATUS_PRESENT
    )
    late_count = sum(
        1 for attendance in attendances
        if attendance.status == Attendance.STATUS_LATE
    )
    pre_canceled_count = sum(
        1 for attendance in attendances
        if attendance.status == Attendance.STATUS_PRE_CANCELED
    )
    no_show_count = sum(
        1 for attendance in attendances
        if attendance.status == Attendance.STATUS_NO_SHOW
    )

    attended_count = present_count + late_count
    checked_count = len(attendances)

    attendance_rate = 0
    no_show_rate = 0

    if applied_count > 0:
        attendance_rate = round((attended_count / applied_count) * 100, 1)
        no_show_rate = round((no_show_count / applied_count) * 100, 1)

    opportunity_count = max(total_event_count, applied_count, 1)
    application_activity_rate = round(
        min((applied_count / opportunity_count) * 100, 100),
        1,
    )

    if applied_count == 0:
        activity_score = 0
    else:
        attendance_score = attendance_rate * 0.7
        no_show_stability_score = max(100 - no_show_rate, 0) * 0.2
        application_score = application_activity_rate * 0.1

        activity_score = round(
            attendance_score + no_show_stability_score + application_score
        )

    risk_reasons = []

    if applied_count == 0:
        risk_reasons.append("참여 신청 기록이 없습니다.")

    if attendance_rate < 50 and applied_count > 0:
        risk_reasons.append("참석률이 50% 미만입니다.")

    if no_show_rate >= 30:
        risk_reasons.append("노쇼율이 30% 이상입니다.")

    if activity_score < 50:
        risk_reasons.append("활동 점수가 50점 미만입니다.")

    if total_event_count == 0:
        risk_level = "data_insufficient"
        risk_level_display = "데이터 부족"
        risk_summary = "완료된 일정 데이터가 없어 활동 상태를 판단하기 어렵습니다."
    elif activity_score < 30 or no_show_rate >= 50:
        risk_level = "danger"
        risk_level_display = "위험"
        risk_summary = "활동 저하 위험이 높아 운영진의 확인이 필요합니다."
    elif activity_score < 50 or attendance_rate < 50 or no_show_rate >= 30:
        risk_level = "warning"
        risk_level_display = "주의"
        risk_summary = "참여율이나 노쇼율에서 관리가 필요한 신호가 있습니다."
    elif activity_score < 70 or attendance_rate < 70 or no_show_rate >= 15:
        risk_level = "watch"
        risk_level_display = "관찰 필요"
        risk_summary = "현재는 큰 문제는 아니지만 활동 추이를 지켜볼 필요가 있습니다."
    else:
        risk_level = "normal"
        risk_level_display = "정상"
        risk_summary = "일정 참여와 출석 기록이 안정적입니다."

    if not risk_reasons:
        risk_reasons.append("특별한 저참여 위험 신호가 없습니다.")

    latest_activity_at = get_latest_activity_at(applications, attendances)

    return {
        "membership_id": membership.id,
        "user": user.id,
        "username": user.username,
        "user_real_name": get_user_real_name(user),
        "role": membership.role,
        "role_display": membership.get_role_display(),
        "member_status": membership.status,
        "member_status_display": membership.get_status_display(),
        "stored_activity_score": membership.activity_score,
        "activity_score": activity_score,
        "risk_level": risk_level,
        "risk_level_display": risk_level_display,
        "risk_summary": risk_summary,
        "risk_reasons": risk_reasons,
        "application": {
            "applied_count": applied_count,
            "canceled_count": canceled_count,
            "application_activity_rate": application_activity_rate,
        },
        "attendance": {
            "checked_count": checked_count,
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
        "latest_activity_at": latest_activity_at,
    }


def get_member_activity_summaries(club_id):
    get_object_or_404(Club, id=club_id)

    total_event_count = Event.objects.filter(
        club_id=club_id,
        status=Event.STATUS_COMPLETED,
    ).count()

    memberships = (
        ClubMembership.objects
        .filter(club_id=club_id)
        .exclude(status="withdrawn")
        .select_related("user", "club")
        .order_by("user__first_name", "user__username")
    )

    summaries = [
        build_member_activity_summary(membership, total_event_count)
        for membership in memberships
    ]

    summaries.sort(
        key=lambda item: (
            item["activity_score"],
            -item["attendance"]["no_show_count"],
            item["user_real_name"],
        )
    )

    total_members = len(summaries)
    low_participation_members = [
        item for item in summaries
        if item["risk_level"] in ["data_insufficient", "danger", "warning", "watch"]
    ]

    average_activity_score = 0

    if total_members > 0:
        average_activity_score = round(
            sum(item["activity_score"] for item in summaries) / total_members,
            1,
        )

    return {
        "club_id": club_id,
        "summary": {
            "total_members": total_members,
            "total_completed_events": total_event_count,
            "average_activity_score": average_activity_score,
            "low_participation_count": len(low_participation_members),
            "danger_count": len([
                item for item in summaries
                if item["risk_level"] == "danger"
            ]),
            "warning_count": len([
                item for item in summaries
                if item["risk_level"] == "warning"
            ]),
            "watch_count": len([
                item for item in summaries
                if item["risk_level"] == "watch"
            ]),
            "data_insufficient_count": len([
                item for item in summaries
                if item["risk_level"] == "data_insufficient"
            ]),
        },
        "results": summaries,
    }


def build_member_activity_detail(club_id, user_id):
    membership = get_object_or_404(
        ClubMembership.objects.select_related("user", "club"),
        club_id=club_id,
        user_id=user_id,
    )

    total_event_count = Event.objects.filter(
        club_id=club_id,
        status=Event.STATUS_COMPLETED,
    ).count()

    summary = build_member_activity_summary(membership, total_event_count)

    applications = (
        EventApplication.objects
        .filter(
            event__club_id=club_id,
            user_id=user_id,
        )
        .select_related("event")
        .order_by("-applied_at")
    )

    attendances = (
        Attendance.objects
        .filter(
            event__club_id=club_id,
            user_id=user_id,
        )
        .select_related("event", "checked_by")
        .order_by("-created_at")
    )

    return {
        "member": summary,
        "applications": [
            {
                "id": application.id,
                "event": application.event.id,
                "event_title": application.event.title,
                "event_status": application.event.status,
                "event_status_display": application.event.get_status_display(),
                "start_at": application.event.start_at,
                "status": application.status,
                "status_display": application.get_status_display(),
                "cancel_reason": application.cancel_reason,
                "applied_at": application.applied_at,
                "canceled_at": application.canceled_at,
            }
            for application in applications
        ],
        "attendances": [
            {
                "id": attendance.id,
                "event": attendance.event.id,
                "event_title": attendance.event.title,
                "event_status": attendance.event.status,
                "event_status_display": attendance.event.get_status_display(),
                "start_at": attendance.event.start_at,
                "status": attendance.status,
                "status_display": attendance.get_status_display(),
                "checked_by": attendance.checked_by_id,
                "checked_by_username": (
                    attendance.checked_by.username
                    if attendance.checked_by else None
                ),
                "checked_at": attendance.checked_at,
                "memo": attendance.memo,
            }
            for attendance in attendances
        ],
    }


class EventMemberActivitySummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        return Response(
            get_member_activity_summaries(club_id),
            status=status.HTTP_200_OK,
        )


class EventMemberActivityDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id, user_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        return Response(
            build_member_activity_detail(club_id, user_id),
            status=status.HTTP_200_OK,
        )


class EventLowParticipationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        data = get_member_activity_summaries(club_id)

        low_members = [
            item for item in data["results"]
            if item["risk_level"] in [
                "data_insufficient",
                "danger",
                "warning",
                "watch",
            ]
        ]

        low_members.sort(
            key=lambda item: (
                {
                    "danger": 0,
                    "warning": 1,
                    "watch": 2,
                    "data_insufficient": 3,
                    "normal": 4,
                }.get(item["risk_level"], 5),
                item["activity_score"],
                item["user_real_name"],
            )
        )

        return Response(
            {
                "club_id": club_id,
                "count": len(low_members),
                "results": low_members,
            },
            status=status.HTTP_200_OK,
        )


class EventMemberActivitySyncView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, club_id):
        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        data = get_member_activity_summaries(club_id)
        updated_count = 0

        for item in data["results"]:
            updated_count += ClubMembership.objects.filter(
                id=item["membership_id"],
                club_id=club_id,
            ).update(
                activity_score=item["activity_score"],
            )

        return Response(
            {
                "message": "회원별 활동 점수가 동아리원 관리 정보에 반영되었습니다.",
                "updated_count": updated_count,
                "summary": data["summary"],
                "results": data["results"],
            },
            status=status.HTTP_200_OK,
        )