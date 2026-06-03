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
    

class MemberRelationObservation(models.Model):
    TAG_FREQUENT = "frequent"
    TAG_NEW_MEMBER_HELP = "new_member_help"
    TAG_OFFICER_MENTORING = "officer_mentoring"
    TAG_SAME_GROUP = "same_group"
    TAG_NEED_WATCH = "need_watch"
    TAG_RELATION_BIAS = "relation_bias"

    TAG_CHOICES = [
        (TAG_FREQUENT, "자주 함께 활동함"),
        (TAG_NEW_MEMBER_HELP, "신입 적응 도움 관계"),
        (TAG_OFFICER_MENTORING, "운영진 멘토링 관계"),
        (TAG_SAME_GROUP, "같은 소그룹"),
        (TAG_NEED_WATCH, "관찰 필요"),
        (TAG_RELATION_BIAS, "관계 편중"),
    ]

    TAG_SCORE_MAP = {
        TAG_FREQUENT: 3,
        TAG_NEW_MEMBER_HELP: 5,
        TAG_OFFICER_MENTORING: 5,
        TAG_SAME_GROUP: 2,
        TAG_NEED_WATCH: -5,
        TAG_RELATION_BIAS: -5,
    }

    club = models.ForeignKey(
        "clubs.Club",
        on_delete=models.CASCADE,
        related_name="relation_observations",
    )

    from_member = models.ForeignKey(
        ClubMembership,
        on_delete=models.CASCADE,
        related_name="relation_observations_from",
    )

    to_member = models.ForeignKey(
        ClubMembership,
        on_delete=models.CASCADE,
        related_name="relation_observations_to",
    )

    tag = models.CharField(
        max_length=30,
        choices=TAG_CHOICES,
    )

    memo = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_relation_observations",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "club_members_relation_observation"
        constraints = [
            models.UniqueConstraint(
                fields=["club", "from_member", "to_member", "tag"],
                name="unique_relation_observation_per_tag",
            )
        ]
        ordering = ["-updated_at", "-id"]

    def save(self, *args, **kwargs):
        if self.from_member_id and self.to_member_id:
            if self.from_member_id > self.to_member_id:
                self.from_member_id, self.to_member_id = (
                    self.to_member_id,
                    self.from_member_id,
                )

        super().save(*args, **kwargs)

    @property
    def score_value(self):
        return self.TAG_SCORE_MAP.get(self.tag, 0)

    def __str__(self):
        return f"{self.club.name} - {self.from_member} / {self.to_member} ({self.get_tag_display()})"