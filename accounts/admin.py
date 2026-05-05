from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'school_name',
        'department',
        'student_id',
        'nickname',
        'role',
        'created_at',
    )

    list_filter = (
        'role',
        'school_name',
        'department',
    )

    search_fields = (
        'user__username',
        'nickname',
        'student_id',
        'school_name',
        'department',
    )

# Django 관리자 페이지에서 Profile 정보를 보기 쉽게 관리하게 한다.