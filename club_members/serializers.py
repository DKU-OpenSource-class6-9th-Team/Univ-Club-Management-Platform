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