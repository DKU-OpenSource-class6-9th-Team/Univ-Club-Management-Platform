from django.conf import settings
from django.db import models


class ClubMembership(models.Model):
    ROLE_CHOICES = [
        ("president", "회장"),
        ("vice_president", "부회장"),
        ("executive", "운영진"),
        ("treasurer", "총무"),
        ("member", "일반 회원"),
    ]

    STATUS_CHOICES = [
        ("new", "신입 회원"),
        ("regular", "정회원"),
        ("inactive", "휴면 회원"),
        ("withdrawn", "탈퇴 회원"),
        ("fee_unpaid", "회비 미납자"),
        ("restricted", "이용 제한 회원"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="managed_club_memberships",
    )

    club = models.ForeignKey(
        "clubs.Club",
        on_delete=models.CASCADE,
        related_name="managed_memberships",
    )

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default="member",
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="new",
    )

    activity_score = models.IntegerField(default=0)

    joined_at = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "club_members_clubmembership"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "club"],
                name="unique_user_managed_club_membership",
            )
        ]
        ordering = ["-joined_at", "id"]

    def __str__(self):
        return f"{self.user.username} - {self.club.name}"