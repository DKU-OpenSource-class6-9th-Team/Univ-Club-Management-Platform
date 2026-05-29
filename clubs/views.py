from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import Club, ClubMembership, BiweeklySurvey, BiweeklySurveyResponse
from .serializers import ClubSerializer
from .services.health_analysis import build_health_analysis_payload

from django.db import transaction
from rest_framework.exceptions import ValidationError
from club_members.models import ClubMembership as ManagedClubMembership

from datetime import date
from django.utils import timezone

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
        profile = getattr(self.request.user, "profile", None)

        if profile is None:
            raise ValidationError({
                "message": "프로필 정보가 없어 동아리를 생성할 수 없습니다."
            })

        with transaction.atomic():
            # 1. Club 테이블에 동아리 생성
            club = serializer.save(created_by=self.request.user)

            # 2. 메인페이지 '내 동아리' 목록용 가입 관계 생성
            ClubMembership.objects.create(
                club=club,
                profile=profile,
                role=ClubMembership.ROLE_MANAGER,
                status=ClubMembership.STATUS_ACTIVE,
            )

            # 3. 동아리원 관리용 테이블에 생성자를 회장으로 자동 등록
            ManagedClubMembership.objects.get_or_create(
                club=club,
                user=self.request.user,
                defaults={
                    "role": "president",
                    "status": "regular",
                    "activity_score": 0,
                },
            )

    def perform_update(self, serializer):
        club = self.get_object()
        remove_image = self.request.data.get('remove_image')

        if remove_image == 'true':
            if club.image:
                club.image.delete(save=False)
            serializer.save(image=None)
        else:
            serializer.save()

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
    
    @action(detail=True, methods=['get'], url_path='survey')
    def get_survey(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response(
                {'message': '로그인이 필요합니다.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        club = self.get_object()
        period = self.get_current_survey_period()

        survey = BiweeklySurvey.objects.filter(
            club=club,
            year=period['year'],
            month=period['month'],
            round_number=period['round_number'],
        ).first()

        response_data = None

        if survey:
            response_data = BiweeklySurveyResponse.objects.filter(
                survey=survey,
                user=request.user,
            ).first()

        return Response({
            'year': period['year'],
            'month': period['month'],
            'round_number': period['round_number'],
            'period_start_date': period['start_date'],
            'period_end_date': period['end_date'],

            'schedule_items': survey.schedule_items if survey else [],
            'fee_items': survey.fee_items if survey else [],

            'answers': response_data.answers if response_data else {},
            'status': response_data.status if response_data else None,
        })

    @action(detail=True, methods=['post'], url_path='survey/items')
    def save_survey_items(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response(
                {'message': '로그인이 필요합니다.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        club = self.get_object()

        if not self.is_club_manager(request, club):
            return Response(
                {'message': '운영진만 조사 항목을 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )

        period = self.get_current_survey_period()

        survey, created = BiweeklySurvey.objects.get_or_create(
            club=club,
            year=period['year'],
            month=period['month'],
            round_number=period['round_number'],
            defaults={
                'period_start_date': period['start_date'],
                'period_end_date': period['end_date'],
                'created_by': request.user,
            }
        )

        survey.schedule_items = request.data.get('schedule_items', [])
        survey.fee_items = request.data.get('fee_items', [])
        survey.period_start_date = period['start_date']
        survey.period_end_date = period['end_date']
        survey.save()

        return Response({
            'message': '조사 항목이 저장되었습니다.',
            'schedule_items': survey.schedule_items,
            'fee_items': survey.fee_items,
            'year': survey.year,
            'month': survey.month,
            'round_number': survey.round_number,
        })

    @action(detail=True, methods=['post'], url_path='survey/draft')
    def save_survey_draft(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response(
                {'message': '로그인이 필요합니다.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        club = self.get_object()
        period = self.get_current_survey_period()

        survey = BiweeklySurvey.objects.filter(
            club=club,
            year=period['year'],
            month=period['month'],
            round_number=period['round_number'],
        ).first()

        if not survey:
            return Response(
                {'message': '등록된 만족도 조사 항목이 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        survey_response, created = BiweeklySurveyResponse.objects.get_or_create(
            survey=survey,
            user=request.user,
            defaults={
                'answers': request.data.get('answers', {}),
                'status': BiweeklySurveyResponse.STATUS_DRAFT,
            }
        )

        if not created:
            if survey_response.status == BiweeklySurveyResponse.STATUS_SUBMITTED:
                return Response(
                    {'message': '이미 제출한 만족도 조사는 수정할 수 없습니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            survey_response.answers = request.data.get('answers', {})
            survey_response.status = BiweeklySurveyResponse.STATUS_DRAFT
            survey_response.save()

        return Response({
            'message': '임시 저장되었습니다.',
            'answers': survey_response.answers,
            'status': survey_response.status,
        })

    @action(detail=True, methods=['post'], url_path='survey/submit')
    def submit_survey(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response(
                {'message': '로그인이 필요합니다.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        club = self.get_object()
        period = self.get_current_survey_period()

        survey = BiweeklySurvey.objects.filter(
            club=club,
            year=period['year'],
            month=period['month'],
            round_number=period['round_number'],
        ).first()

        if not survey:
            return Response(
                {'message': '등록된 만족도 조사 항목이 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        answers = request.data.get('answers', {})

        total_count = len(survey.schedule_items) + len(survey.fee_items)

        if total_count == 0:
            return Response(
                {'message': '제출할 만족도 조사 항목이 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(answers.keys()) < total_count:
            return Response(
                {'message': '모든 항목을 평가해야 제출할 수 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        survey_response, created = BiweeklySurveyResponse.objects.get_or_create(
            survey=survey,
            user=request.user,
            defaults={
                'answers': answers,
                'status': BiweeklySurveyResponse.STATUS_SUBMITTED,
                'submitted_at': timezone.now(),
            }
        )

        if not created:
            if survey_response.status == BiweeklySurveyResponse.STATUS_SUBMITTED:
                return Response(
                    {'message': '이미 제출한 만족도 조사입니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            survey_response.answers = answers
            survey_response.status = BiweeklySurveyResponse.STATUS_SUBMITTED
            survey_response.submitted_at = timezone.now()
            survey_response.save()

        return Response({
            'message': '만족도 조사가 제출되었습니다.',
            'status': survey_response.status,
        })
    
    # 지금 날짜가 만족도 조사 몇 차 기간인지 계산하는 함수
    def get_current_survey_period(self):
        today = date.today()

        year = today.year
        month = today.month

        if today.day <= 14:
            round_number = 1
            start_date = date(year, month, 1)
            end_date = date(year, month, 14)
        else:
            round_number = 2
            start_date = date(year, month, 15)

            if month == 12:
                end_date = date(year, 12, 31)
            else:
                end_date = date(year, month + 1, 1) - timezone.timedelta(days=1)

        return {
            'year': year,
            'month': month,
            'round_number': round_number,
            'start_date': start_date,
            'end_date': end_date,
        }

    # 현재 로그인한 사용자가 이 동아리 운영진인지 확인하는 함수
    def is_club_manager(self, request, club):
        profile = getattr(request.user, 'profile', None)

        if profile is None:
            return False

        return ClubMembership.objects.filter(
            club=club,
            profile=profile,
            role=ClubMembership.ROLE_MANAGER,
            status=ClubMembership.STATUS_ACTIVE,
        ).exists()
    

    #동아리 운영 건강도 분석 API,   요청 주소: GET /api/clubs/{club_id}/health/
    #역할:
    #1. 현재 동아리의 회원, 회비, 만족도 데이터를 조회한다.
    #2. health_analysis.py의 계산 함수를 호출한다.
    #3. 프론트 건강도 분석 페이지에서 사용할 JSON 데이터를 반환한다.
    #4. AI 기능은 아직 직접 실행하지 않고, 연동 예정 구조만 반환한다.
    @action(detail=True, methods=['get'], url_path='health')
    def get_health_analysis(self, request, pk=None):

        # URL의 club_id에 해당하는 Club 객체를 가져옴
        club = self.get_object()

        # 실제 건강도 계산은 services/health_analysis.py에 분리
        payload = build_health_analysis_payload(club)

        return Response(payload)