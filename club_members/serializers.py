from rest_framework import serializers
from .models import ClubMembership


class ClubMembershipListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    name = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()

    club_name = serializers.CharField(source="club.name", read_only=True)

    role_display = serializers.CharField(source="get_role_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

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