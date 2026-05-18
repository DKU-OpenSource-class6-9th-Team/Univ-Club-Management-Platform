from rest_framework import serializers
from .models import Club


class ClubSerializer(serializers.ModelSerializer):
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
            'max_members',
            'leader_name',
            'contact_phone',
            'contact_email',
            'location',
            'image',
            'created_by',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'created_by',
            'created_at',
            'updated_at',
        ]