from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import Club, ClubMembership
from .serializers import ClubSerializer

# 동아리 등록/조회/수정/삭제 API를 처리하는 ViewSet
class ClubViewSet(viewsets.ModelViewSet):

    queryset = Club.objects.all().order_by('-created_at')
    serializer_class = ClubSerializer

    # 조회는 로그인하지 않아도 가능,
    # 등록/수정/삭제는 로그인한 사용자만 가능
    permission_classes = [IsAuthenticatedOrReadOnly]

    # 동아리 등록 시 실행되는 함수
    # 1. Club 테이블에 동아리 정보를 저장
    # 2. 등록한 사용자를 해당 동아리의 MANAGER로 ClubMembership에 자동 저장
    def perform_create(self, serializer):

        # 현재 로그인한 사용자를 created_by로 저장
        club = serializer.save(created_by=self.request.user)

        # 동아리를 만든 사용자를 해당 동아리의 관리자로 자동 등록
        ClubMembership.objects.create(
            club=club,
            profile=self.request.user.profile,
            role=ClubMembership.ROLE_MANAGER,
            status=ClubMembership.STATUS_ACTIVE
        )

    # 현재 로그인한 사용자가 가입했거나 관리 중인 동아리 목록을 반환
    @action(detail=False, methods=['get'], url_path='my')
    def my_clubs(self, request):

        # 로그인하지 않은 사용자는 내 동아리 목록을 조회할 수 없음
        if not request.user.is_authenticated:
            return Response(
                {'message': '로그인이 필요합니다.'},
                status=401
            )

        # 현재 로그인한 사용자의 ACTIVE 상태 membership만 조회
        clubs = Club.objects.filter(
            memberships__profile=request.user.profile,
            memberships__status=ClubMembership.STATUS_ACTIVE
        ).order_by('-created_at')

        serializer = self.get_serializer(clubs, many=True)

        return Response(serializer.data)
    
        # 사용자가 동아리에 가입 신청
    @action(detail=True, methods=['post'], url_path='join')
    def join_club(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response(
                {'message': '로그인이 필요합니다.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        club = self.get_object()

        profile = getattr(request.user, 'profile', None)

        if profile is None:
            return Response(
                {'message': '프로필 정보가 없어 가입 신청을 할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        membership, created = ClubMembership.objects.get_or_create(
            club=club,
            profile=profile,
            defaults={
                'role': ClubMembership.ROLE_MEMBER,
                'status': ClubMembership.STATUS_PENDING,
            }
        )

        if created:
            return Response(
                {'message': '가입 신청이 완료되었습니다.'},
                status=status.HTTP_201_CREATED
            )

        if membership.status == ClubMembership.STATUS_ACTIVE:
            return Response(
                {'message': '이미 가입된 동아리입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if membership.status == ClubMembership.STATUS_PENDING:
            return Response(
                {'message': '이미 가입 신청 대기 중입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if membership.status in [
            ClubMembership.STATUS_INACTIVE,
            ClubMembership.STATUS_REJECTED,
        ]:
            membership.status = ClubMembership.STATUS_PENDING
            membership.role = ClubMembership.ROLE_MEMBER
            membership.save(update_fields=['status', 'role'])

            return Response(
                {'message': '가입 신청이 다시 접수되었습니다.'},
                status=status.HTTP_200_OK
            )

        return Response(
            {'message': '가입 신청을 처리할 수 없는 상태입니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )