from django.contrib import admin
from .models import Club


@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'name',
        'category',
        'club_type',
        'is_recruiting',
        'created_by',
        'created_at',
        'updated_at',
    )

    search_fields = ('name', 'category', 'leader_name')
    list_filter = ('category', 'club_type', 'is_recruiting')
