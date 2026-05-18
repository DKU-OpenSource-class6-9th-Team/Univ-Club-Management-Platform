from django.db import models
from django.conf import settings


class Club(models.Model):
    # 동아리명
    name = models.CharField(max_length=100)

    # 분야 / 카테고리
    category = models.CharField(max_length=50)

    # 중앙동아리 / 기타동아리 등 동아리 유형
    club_type = models.CharField(max_length=30, blank=True)

    # 동아리 소개
    description = models.TextField(blank=True)

    # 모집 여부
    is_recruiting = models.BooleanField(default=False)

    # 모집 시작일 / 종료일
    recruit_start_date = models.DateField(null=True, blank=True)
    recruit_end_date = models.DateField(null=True, blank=True)

    # 모집 인원
    max_members = models.PositiveIntegerField(null=True, blank=True)

    # 대표자 이름
    leader_name = models.CharField(max_length=50, blank=True)

    # 대표 연락처
    contact_phone = models.CharField(max_length=30, blank=True)

    # 대표 이메일
    contact_email = models.EmailField(blank=True)

    # 동방 위치
    location = models.CharField(max_length=100, blank=True)

    # 동아리 이미지
    image = models.ImageField(upload_to='club_images/', null=True, blank=True)

    # 이 동아리를 등록한 사용자
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_clubs'
    )

    # 생성일 / 수정일
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # 관리자 페이지나 출력에서 동아리명이 보이도록 설정
    def __str__(self):
        return self.name

# 메인페이지의 '내가 가입한 동아리' 목록을 위해 사용자와 동아리의 관계를 저장하는 테이블
class ClubMembership(models.Model):

    # 동아리 안에서의 역할 구분
    ROLE_MANAGER = 'MANAGER'
    ROLE_MEMBER = 'MEMBER'

    ROLE_CHOICES = [
        (ROLE_MANAGER, '관리자'),
        (ROLE_MEMBER, '일반 회원'),
    ]

    # 동아리 가입 상태 구분
    STATUS_ACTIVE = 'ACTIVE'
    STATUS_PENDING = 'PENDING'
    STATUS_INACTIVE = 'INACTIVE'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, '활동 중'),
        (STATUS_PENDING, '승인 대기'),
        (STATUS_INACTIVE, '비활동'),
    ]

    # 어떤 동아리에 속해 있는지 저장
    # Club이 삭제되면 해당 동아리의 membership도 함께 삭제됨
    club = models.ForeignKey(
        Club,
        on_delete=models.CASCADE,
        related_name='memberships'
    )

    # 어떤 사용자의 프로필인지 저장
    # accounts.Profile과 연결해서 사용자 상세 정보/역할과 연동
    profile = models.ForeignKey(
        'accounts.Profile',
        on_delete=models.CASCADE,
        related_name='club_memberships'
    )

    # 동아리 내부 역할
    # 동아리를 생성한 사람은 MANAGER, 가입한 일반 사용자는 MEMBER로 저장할 예정
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_MEMBER
    )

    # 가입 상태
    # 현재는 동아리 생성 시 ACTIVE로 저장하고,
    # 나중에 가입 신청 기능에서는 PENDING → 승인 후 ACTIVE로 확장 가능
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE
    )

    # 동아리에 가입된 시점
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # 같은 사용자가 같은 동아리에 중복 가입되지 않도록 제한
        unique_together = ('club', 'profile')

    def __str__(self):
        return f'{self.profile.nickname} - {self.club.name}'