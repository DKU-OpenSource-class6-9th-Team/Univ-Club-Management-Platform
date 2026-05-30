from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from club_members.models import ClubMembership
from clubs.models import Club

from .models import Event
from .serializers import EventSerializer


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
        return get_object_or_404(
            Event.objects.select_related("club", "created_by"),
            id=event_id,
            club_id=club_id,
        )

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