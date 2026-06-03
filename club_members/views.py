from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from clubs.models import ClubMembership as ClubJoinMembership
from clubs.models import Club

from .models import (
    ClubMembership as ManagedClubMembership,
    MemberRelationObservation,
)
from .serializers import (
    ClubJoinRequestListSerializer,
    ClubMembershipListSerializer,
    ClubMembershipUpdateSerializer,
    MemberRelationObservationSerializer,
)
from .services import (
    build_member_network_detail,
    build_participation_network,
)


class ClubMembershipListView(ListAPIView):
    serializer_class = ClubMembershipListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        club_id = self.kwargs["club_id"]

        queryset = (
            ManagedClubMembership.objects
            .filter(club_id=club_id)
            .select_related("user", "club")
            .order_by("-joined_at", "id")
        )

        search = self.request.query_params.get("search", "").strip()
        role = self.request.query_params.get("role", "").strip()
        status_value = self.request.query_params.get("status", "").strip()
        min_score = self.request.query_params.get("min_score", "").strip()
        max_score = self.request.query_params.get("max_score", "").strip()

        if search:
            queryset = queryset.filter(
                Q(user__username__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__profile__nickname__icontains=search)
                | Q(user__profile__student_id__icontains=search)
                | Q(user__profile__department__icontains=search)
            )

        if role:
            queryset = queryset.filter(role=role)

        if status_value:
            queryset = queryset.filter(status=status_value)

        if min_score:
            try:
                queryset = queryset.filter(activity_score__gte=int(min_score))
            except ValueError:
                pass

        if max_score:
            try:
                queryset = queryset.filter(activity_score__lte=int(max_score))
            except ValueError:
                pass

        return queryset


class ClubJoinRequestListView(ListAPIView):
    serializer_class = ClubJoinRequestListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        club_id = self.kwargs["club_id"]

        return (
            ClubJoinMembership.objects
            .filter(
                club_id=club_id,
                status=ClubJoinMembership.STATUS_PENDING,
            )
            .select_related("club", "profile", "profile__user")
            .order_by("-joined_at", "id")
        )


class ClubJoinRequestApproveView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, club_id, membership_id):
        join_request = get_object_or_404(
            ClubJoinMembership.objects.select_related(
                "club",
                "profile",
                "profile__user",
            ),
            id=membership_id,
            club_id=club_id,
        )

        if join_request.status != ClubJoinMembership.STATUS_PENDING:
            return Response(
                {"message": "승인 대기 상태의 가입 신청만 승인할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        join_request.status = ClubJoinMembership.STATUS_ACTIVE
        join_request.save(update_fields=["status"])

        ManagedClubMembership.objects.get_or_create(
            user=join_request.profile.user,
            club=join_request.club,
            defaults={
                "role": "member",
                "status": "new",
                "activity_score": 0,
            },
        )

        return Response(
            {"message": "가입 신청을 승인했습니다."},
            status=status.HTTP_200_OK,
        )


class ClubJoinRequestRejectView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, club_id, membership_id):
        join_request = get_object_or_404(
            ClubJoinMembership.objects.select_related(
                "club",
                "profile",
                "profile__user",
            ),
            id=membership_id,
            club_id=club_id,
        )

        if join_request.status != ClubJoinMembership.STATUS_PENDING:
            return Response(
                {"message": "승인 대기 상태의 가입 신청만 거절할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        join_request.status = ClubJoinMembership.STATUS_REJECTED
        join_request.save(update_fields=["status"])

        return Response(
            {"message": "가입 신청을 거절했습니다."},
            status=status.HTTP_200_OK,
        )
    

class ClubMembershipDetailUpdateView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, club_id, membership_id):
        return get_object_or_404(
            ManagedClubMembership.objects.select_related("user", "club"),
            id=membership_id,
            club_id=club_id,
        )

    def get(self, request, club_id, membership_id):
        member = self.get_object(club_id, membership_id)
        serializer = ClubMembershipListSerializer(member)

        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, club_id, membership_id):
        member = self.get_object(club_id, membership_id)

        serializer = ClubMembershipUpdateSerializer(
            member,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        response_serializer = ClubMembershipListSerializer(member)

        return Response(
            {
                "message": "동아리원 정보가 수정되었습니다.",
                "member": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )
    
class ClubMemberActivityScoreSyncView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, club_id):
        from events.views import get_member_activity_summaries, require_event_manager

        permission_error = require_event_manager(request, club_id)

        if permission_error is not None:
            return permission_error

        activity_data = get_member_activity_summaries(club_id)
        updated_count = 0
        results = []

        for item in activity_data["results"]:
            calculated_score = item.get(
                "calculated_activity_score",
                item.get("activity_score", 0),
            )

            updated_count += ManagedClubMembership.objects.filter(
                id=item["membership_id"],
                club_id=club_id,
            ).update(
                activity_score=calculated_score,
            )

            item["stored_activity_score"] = calculated_score
            results.append(item)

        activity_data["results"] = results
        activity_data["summary"]["updated_count"] = updated_count

        return Response(
            {
                "message": "일정·출석 기반 자동 계산 점수를 공식 활동 점수에 반영했습니다.",
                "updated_count": updated_count,
                "score_policy": activity_data.get("score_policy", {}),
                "summary": activity_data["summary"],
                "results": activity_data["results"],
            },
            status=status.HTTP_200_OK,
        )
    
class ClubParticipationNetworkView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id):
        data = build_participation_network(club_id)

        return Response(data, status=status.HTTP_200_OK)


class ClubParticipationNetworkDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id, membership_id):
        data = build_member_network_detail(club_id, membership_id)

        if not data:
            return Response(
                {"message": "참여 연결도 분석 대상 회원을 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(data, status=status.HTTP_200_OK)


class MemberRelationObservationCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, club_id):
        club = get_object_or_404(Club, id=club_id)

        serializer = MemberRelationObservationSerializer(
            data=request.data,
            context={"club": club},
        )

        serializer.is_valid(raise_exception=True)

        created_by = request.user if request.user.is_authenticated else None

        observation = serializer.save(
            club=club,
            created_by=created_by,
        )

        response_serializer = MemberRelationObservationSerializer(observation)

        return Response(
            {
                "message": "운영진 관계 관찰 기록이 등록되었습니다.",
                "observation": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class MemberRelationObservationDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, club_id, observation_id):
        return get_object_or_404(
            MemberRelationObservation.objects.select_related(
                "club",
                "from_member",
                "from_member__user",
                "to_member",
                "to_member__user",
                "created_by",
            ),
            id=observation_id,
            club_id=club_id,
        )

    def patch(self, request, club_id, observation_id):
        observation = self.get_object(club_id, observation_id)

        serializer = MemberRelationObservationSerializer(
            observation,
            data=request.data,
            partial=True,
            context={"club": observation.club},
        )

        serializer.is_valid(raise_exception=True)
        observation = serializer.save()

        response_serializer = MemberRelationObservationSerializer(observation)

        return Response(
            {
                "message": "운영진 관계 관찰 기록이 수정되었습니다.",
                "observation": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, club_id, observation_id):
        observation = self.get_object(club_id, observation_id)
        observation.delete()

        return Response(
            {"message": "운영진 관계 관찰 기록이 삭제되었습니다."},
            status=status.HTTP_200_OK,
        )