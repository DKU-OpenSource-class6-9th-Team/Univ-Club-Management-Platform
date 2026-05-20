from django.contrib import admin
from .models import FeeReceipt, FeeTransaction, MemberFeePayment


class FeeReceiptInline(admin.TabularInline):  # admin페이지에서 연결된 영수증 목록 확인
    model = FeeReceipt
    extra = 0


@admin.register(FeeTransaction)
class FeeTransactionAdmin(admin.ModelAdmin):
    list_display = (  # 목록에서 어떤 필드를 보여주는지
        'id',
        'club_id',
        'transaction_type',
        'transaction_date',
        'content',
        'category',
        'amount',
        'created_at',
    )

    list_filter = (  # 필터링하여 보여주도록 하는 코드
        'transaction_type',
        'category',
        'transaction_date',
    )

    search_fields = (  # 검색 가능하도록 한 코드
        'content',
        'category',
        'target',
        'memo',
    )

    inlines = [FeeReceiptInline]


@admin.register(FeeReceipt)
class FeeReceiptAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'transaction',
        'original_name',
        'uploaded_at',
    )


@admin.register(MemberFeePayment)
class MemberFeePaymentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'club_id',
        'user',
        'status',
        'amount',
        'paid_at',
        'note',
        'created_at',
        'updated_at',
    )

    list_filter = (
        'status',
        'club_id',
        'paid_at',
    )

    search_fields = (
        'user__username',
        'user__email',
        'user__profile__nickname',
        'user__profile__student_id',
        'user__profile__department',
        'note',
    )

    readonly_fields = (
        'created_at',
        'updated_at',
    )

    ordering = (
        'club_id',
        'user__username',
    )