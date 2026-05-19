from rest_framework import serializers
from .models import ClubMembership
from clubs.models import ClubMembership as ClubJoinMembership


class ClubMembershipListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    name = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()

    club_name = serializers.CharField(source="club.name", read_only=True)

    role_display = serializers.CharField(source="get_role_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    activity_grade = serializers.SerializerMethodField()
    activity_grade_display = serializers.SerializerMethodField()

    role_permission_level = serializers.SerializerMethodField()
    role_permission_summary = serializers.SerializerMethodField()
    role_permissions = serializers.SerializerMethodField()

    class Meta:
        model = ClubMembership
        fields = [
            "id",
            "user",
            "username",
            "email",
            "name",
            "student_id",
            "department",
            "club",
            "club_name",
            "role",
            "role_display",
            "role_permission_level",
            "role_permission_summary",
            "role_permissions",
            "status",
            "status_display",
            "activity_score",
            "activity_grade",
            "activity_grade_display",
            "joined_at",
            "updated_at",
        ]

    def get_name(self, obj):
        profile = getattr(obj.user, "profile", None)

        if profile and getattr(profile, "nickname", None):
            return profile.nickname

        if obj.user.first_name:
            return obj.user.first_name

        return obj.user.username

    def get_student_id(self, obj):
        profile = getattr(obj.user, "profile", None)
        return getattr(profile, "student_id", "")

    def get_department(self, obj):
        profile = getattr(obj.user, "profile", None)
        return getattr(profile, "department", "")
    
    def get_activity_grade(self, obj):
        score = obj.activity_score or 0

        if score >= 90:
            return "excellent"

        if score >= 70:
            return "active"

        if score >= 50:
            return "normal"

        if score >= 30:
            return "warning"

        return "danger"

    def get_activity_grade_display(self, obj):
        grade = self.get_activity_grade(obj)

        grade_labels = {
            "excellent": "우수",
            "active": "활발",
            "normal": "보통",
            "warning": "주의",
            "danger": "위험",
        }

        return grade_labels.get(grade, "보통")
    
    def get_role_permission_info(self, obj):
        permission_map = {
            "president": {
                "level": "owner",
                "summary": "전체 관리 권한",
                "permissions": [
                    "동아리 정보 관리",
                    "동아리원 관리",
                    "역할 및 권한 관리",
                    "일정 관리",
                    "회비 관리",
                    "홍보/모집 관리",
                    "건강도 대시보드 관리",
                ],
            },
            "vice_president": {
                "level": "manager",
                "summary": "운영 보조 및 주요 관리 권한",
                "permissions": [
                    "동아리원 관리",
                    "일정 관리",
                    "홍보/모집 관리",
                    "건강도 대시보드 확인",
                ],
            },
            "executive": {
                "level": "staff",
                "summary": "일정, 출석, 홍보 운영 권한",
                "permissions": [
                    "일정 관리",
                    "출석 관리",
                    "홍보/모집 관리",
                    "동아리원 활동 정보 확인",
                ],
            },
            "treasurer": {
                "level": "finance",
                "summary": "회비 관리 권한",
                "permissions": [
                    "회비 납부 내역 관리",
                    "수입/지출 내역 관리",
                    "영수증 관리",
                    "회비 건강도 확인",
                ],
            },
            "member": {
                "level": "basic",
                "summary": "조회 및 참여 권한",
                "permissions": [
                    "동아리 정보 조회",
                    "일정 확인",
                    "활동 참여",
                    "본인 활동 정보 확인",
                ],
            },
        }

        return permission_map.get(obj.role, permission_map["member"])

    def get_role_permission_level(self, obj):
        return self.get_role_permission_info(obj)["level"]

    def get_role_permission_summary(self, obj):
        return self.get_role_permission_info(obj)["summary"]

    def get_role_permissions(self, obj):
        return self.get_role_permission_info(obj)["permissions"]
    

class ClubJoinRequestListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="profile.user.username", read_only=True)
    email = serializers.EmailField(source="profile.user.email", read_only=True)

    name = serializers.SerializerMethodField()
    student_id = serializers.CharField(source="profile.student_id", read_only=True)
    department = serializers.CharField(source="profile.department", read_only=True)

    club_name = serializers.CharField(source="club.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ClubJoinMembership
        fields = [
            "id",
            "profile",
            "username",
            "email",
            "name",
            "student_id",
            "department",
            "club",
            "club_name",
            "status",
            "status_display",
            "joined_at",
        ]

    def get_name(self, obj):
        if getattr(obj.profile, "nickname", None):
            return obj.profile.nickname

        if obj.profile.user.first_name:
            return obj.profile.user.first_name

        return obj.profile.user.username
    
class ClubMembershipUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubMembership
        fields = [
            "role",
            "status",
            "activity_score",
        ]

    def validate_activity_score(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("활동 점수는 0점 이상 100점 이하로 입력해야 합니다.")

        return value