from django.conf import settings
from django.db import models


class Profile(models.Model):
    ROLE_USER = 'USER'
    ROLE_CLUB_MANAGER = 'CLUB_MANAGER'

    ROLE_CHOICES = [
        (ROLE_USER, '일반 사용자'),
        (ROLE_CLUB_MANAGER, '동아리 관리자'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )

    school_name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    student_id = models.CharField(max_length=30)
    nickname = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=20, blank=True)

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_USER
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} Profile'
    

    # User 기본 계정 정보
    # -> 아이디, 비밀번호, 이메일
    # Profile 추가 사용자 정보
    # -> 학교, 학과, 학번, 닉네임, 전화번호, 역할
    # USER = 일반 사용자, CLUB_MANAGER = 동아리 관리자