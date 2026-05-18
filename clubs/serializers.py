from rest_framework import serializers
from .models import Club, ClubMembership


class ClubSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Club
        fields = [
            'id',
            'name',
            'category',
            'club_type',
            'description',
            'is_recruiting',
            'recruit_start_date',
            'recruit_end_date',
            'capacity',
            'recruit_members',
            'member_count',
            'leader_name',
            'contact_phone',
            'contact_email',
            'location',
            'image',
            'created_at',
            'updated_at',
        ]

    def get_member_count(self, obj):
        return obj.memberships.filter(
            status=ClubMembership.STATUS_ACTIVE
        ).count()