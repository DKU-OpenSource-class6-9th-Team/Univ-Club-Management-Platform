from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .models import (
	Club,
	ClubMembership,
	SurveyState,
	SurveyItem,
	SurveySubmission,
)
from .serializers import ClubSerializer
from .services.health_analysis import build_health_analysis_payload

from django.db import transaction
from django.utils import timezone
from club_members.models import ClubMembership as ManagedClubMembership

# 동아리 관련 API를 처리하는 ViewSet
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
	
	# 만족도 조사 API
	def serialize_survey_item(self, item):
		return {
			'id': f'{item.item_type}-{item.original_id}',
			'originalId': item.original_id,
			'title': item.title,
			'date': item.date,
			'type': item.fee_type,
			'category': item.category,
			'amount': item.amount,
			'participants': item.participants,
			'totalMembers': item.total_members,
			'is_new': item.is_new,
			'isNew': item.is_new,
		}

	def get_or_create_survey_state(self, club):
		state, _ = SurveyState.objects.get_or_create(club=club)
		return state

	@action(detail=True, methods=['get'], url_path='surveys/monthly')
	def monthly_survey(self, request, pk=None):
		if not request.user.is_authenticated:
			return Response(
				{'message': '로그인이 필요합니다.'},
				status=status.HTTP_401_UNAUTHORIZED
			)

		club = self.get_object()
		state = self.get_or_create_survey_state(club)

		submission, _ = SurveySubmission.objects.get_or_create(
			club=club,
			user=request.user,
		)

		schedule_items = SurveyItem.objects.filter(
			club=club,
			item_type=SurveyItem.TYPE_SCHEDULE
		).order_by('-is_new', 'display_order', '-created_at')

		fee_items = SurveyItem.objects.filter(
			club=club,
			item_type=SurveyItem.TYPE_FEE
		).order_by('-is_new', 'display_order', '-created_at')

		has_submitted = submission.has_submitted
		needs_resubmit = (
			submission.has_submitted
			and submission.submitted_version < state.survey_version
		)

		fee_updated_date = ''
		if state.fee_updated_at:
			fee_updated_date = state.fee_updated_at.strftime('%Y-%m-%d')

		return Response({
			'schedule_items': [
				self.serialize_survey_item(item)
				for item in schedule_items
			],
			'fee_items': [
				self.serialize_survey_item(item)
				for item in fee_items
			],
			'answers': submission.answers or {},
			'has_submitted': has_submitted,
			'needs_resubmit': needs_resubmit,
			'survey_version': state.survey_version,
			'fee_updated_date': fee_updated_date,
		})

	@action(detail=True, methods=['post'], url_path='surveys/items')
	def save_survey_items(self, request, pk=None):
		if not request.user.is_authenticated:
			return Response(
				{'message': '로그인이 필요합니다.'},
				status=status.HTTP_401_UNAUTHORIZED
			)

		club = self.get_object()
		state = self.get_or_create_survey_state(club)

		schedule_items = request.data.get('schedule_items', [])
		fee_items = request.data.get('fee_items', [])

		has_new_item = False
		now = timezone.now()

		def sync_items(item_type, items):
			nonlocal has_new_item

			selected_original_ids = []

			for index, item in enumerate(items):
				original_id = str(
					item.get('originalId')
					or item.get('original_id')
					or item.get('id', '').replace(f'{item_type}-', '')
				)

				selected_original_ids.append(original_id)

				survey_item, created = SurveyItem.objects.get_or_create(
					club=club,
					item_type=item_type,
					original_id=original_id,
					defaults={
						'title': item.get('title', ''),
						'date': item.get('date', ''),
						'fee_type': item.get('type', ''),
						'category': item.get('category', ''),
						'amount': item.get('amount') or 0,
						'participants': item.get('participants') or 0,
						'total_members': (
							item.get('totalMembers')
							or item.get('total_members')
							or 0
						),
						'display_order': index,
						'is_new': True,
					}
				)

				if created:
					has_new_item = True
				else:
					survey_item.title = item.get('title', survey_item.title)
					survey_item.date = item.get('date', survey_item.date)
					survey_item.fee_type = item.get('type', survey_item.fee_type)
					survey_item.category = item.get('category', survey_item.category)
					survey_item.amount = item.get('amount') or survey_item.amount
					survey_item.participants = item.get('participants') or 0
					survey_item.total_members = (
						item.get('totalMembers')
						or item.get('total_members')
						or 0
					)
					survey_item.display_order = index
					survey_item.save()

			SurveyItem.objects.filter(
				club=club,
				item_type=item_type
			).exclude(
				original_id__in=selected_original_ids
			).delete()

		sync_items(SurveyItem.TYPE_SCHEDULE, schedule_items)
		sync_items(SurveyItem.TYPE_FEE, fee_items)

		if has_new_item:
			state.survey_version += 1

		state.fee_updated_at = now
		state.save()

		schedule_queryset = SurveyItem.objects.filter(
			club=club,
			item_type=SurveyItem.TYPE_SCHEDULE
		).order_by('-is_new', 'display_order', '-created_at')

		fee_queryset = SurveyItem.objects.filter(
			club=club,
			item_type=SurveyItem.TYPE_FEE
		).order_by('-is_new', 'display_order', '-created_at')

		return Response({
			'message': '조사 항목이 저장되었습니다.',
			'schedule_items': [
				self.serialize_survey_item(item)
				for item in schedule_queryset
			],
			'fee_items': [
				self.serialize_survey_item(item)
				for item in fee_queryset
			],
			'fee_updated_date': state.fee_updated_at.strftime('%Y-%m-%d'),
			'survey_version': state.survey_version,
		})

	@action(detail=True, methods=['post'], url_path='surveys/draft')
	def save_survey_draft(self, request, pk=None):
		if not request.user.is_authenticated:
			return Response(
				{'message': '로그인이 필요합니다.'},
				status=status.HTTP_401_UNAUTHORIZED
			)

		club = self.get_object()

		submission, _ = SurveySubmission.objects.get_or_create(
			club=club,
			user=request.user,
		)

		submission.answers = request.data.get('answers', {})
		submission.draft_updated_at = timezone.now()
		submission.save()

		return Response({
			'message': '임시 저장되었습니다.',
			'answers': submission.answers,
		})

	@action(detail=True, methods=['post'], url_path='surveys/submit')
	def submit_survey(self, request, pk=None):
		if not request.user.is_authenticated:
			return Response(
				{'message': '로그인이 필요합니다.'},
				status=status.HTTP_401_UNAUTHORIZED
			)

		club = self.get_object()
		state = self.get_or_create_survey_state(club)

		submission, _ = SurveySubmission.objects.get_or_create(
			club=club,
			user=request.user,
		)

		if (
			submission.has_submitted
			and submission.submitted_version >= state.survey_version
		):
			return Response({
				'message': '이미 제출한 만족도 조사입니다.',
				'already_submitted': True,
				'has_submitted': True,
				'needs_resubmit': False,
			})

		answers = request.data.get('answers', {})

		schedule_items = SurveyItem.objects.filter(
			club=club,
			item_type=SurveyItem.TYPE_SCHEDULE
		)

		fee_items = SurveyItem.objects.filter(
			club=club,
			item_type=SurveyItem.TYPE_FEE
		)

		required_item_ids = [
			f'{item.item_type}-{item.original_id}'
			for item in list(schedule_items) + list(fee_items)
		]

		missing_item_ids = [
			item_id
			for item_id in required_item_ids
			if str(item_id) not in answers
		]

		if missing_item_ids:
			return Response(
				{
					'message': '모든 항목을 평가해야 제출할 수 있습니다.',
					'missing_item_ids': missing_item_ids,
				},
				status=status.HTTP_400_BAD_REQUEST
			)

		was_resubmit = (
			submission.has_submitted
			and submission.submitted_version < state.survey_version
		)

		if was_resubmit:
			message = '만족도 조사가 다시 제출되었습니다.'
		else:
			message = '만족도 조사가 제출되었습니다.'

		submission.answers = answers
		submission.has_submitted = True
		submission.submitted_at = timezone.now()
		submission.submitted_version = state.survey_version
		submission.save()

		SurveyItem.objects.filter(
			club=club,
			item_type__in=[SurveyItem.TYPE_SCHEDULE, SurveyItem.TYPE_FEE],
		).update(is_new=False)

		return Response({
			'message': message,
			'has_submitted': True,
			'needs_resubmit': False,
			'answers': submission.answers,
		})
	

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