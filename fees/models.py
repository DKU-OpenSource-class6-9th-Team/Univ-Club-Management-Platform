from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


def validate_receipt_file(file):
    """
    영수증 파일 검증 함수

    역할:
    1. 파일 크기가 10MB를 넘는지 확인
    2. 확장자가 jpg, jpeg, png, pdf 중 하나인지 확인

    주의:
    Django 모델의 validators는 Model.objects.create()만으로는
    항상 자동 실행되지 않을 수 있으므로,
    views.py에서도 이 함수를 직접 호출해줄 예정.
    """

    max_size = 10 * 1024 * 1024  # 10MB
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf']

    if file.size > max_size:
        raise ValidationError('영수증 파일은 10MB 이하만 첨부할 수 있습니다.')

    ext = Path(file.name).suffix.lower() #확장자 가져옴

    if ext not in allowed_extensions:
        raise ValidationError('JPG, PNG, PDF 파일만 첨부할 수 있습니다.')


class FeeTransaction(models.Model): #feetransation 테이블 생성
    """
    수입 / 지출 내역 테이블"""

    INCOME = 'INCOME'
    EXPENSE = 'EXPENSE'

    TRANSACTION_TYPE_CHOICES = [
        (INCOME, '수입'),
        (EXPENSE, '지출'),
    ]

    # 현재 clubs 앱의 Club 모델 연동이 확정되지 않았을 수 있으므로
    # 우선 club_id 숫자만 저장하는 방식으로 구현
    club_id = models.PositiveIntegerField()

    # 수입인지 지출인지 저장
    transaction_type = models.CharField(
        max_length=10,
        choices=TRANSACTION_TYPE_CHOICES,
    )

    # 실제 거래 날짜
    transaction_date = models.DateField()

    # 내용 예: 5월 정기 회비, 간식 구매, 대관비
    content = models.CharField(max_length=100)

    # 카테고리 예: 회비, 활동비, 운영/관리비, 기타
    category = models.CharField(max_length=50)

    # 금액은 항상 양수로 저장
    # 지출인지 수입인지는 transaction_type으로 구분
    amount = models.PositiveIntegerField()

    # 관련 대상 / 항목
    target = models.CharField(max_length=100, blank=True)

    # 추가 메모(선택입력)
    memo = models.TextField(blank=True)

    # 누가 등록했는지 저장
    # 로그인 기능과 연결되면 request.user가 들어감
    # 사용자가 삭제되어도 거래 내역은 남길 수 있도록 SET_NULL 사용
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    # 등록 시각 자동 저장
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # 최근 거래가 먼저 보이도록 정렬
        ordering = ['-transaction_date', '-created_at']

    def __str__(self):
        return f'[{self.get_transaction_type_display()}] {self.content} - {self.amount}원'

    #프론트에 보여줄 금액 계산
    @property
    def signed_amount(self):
        """
        프론트 테이블 표시용 금액

        수입: +10000
        지출: -30000

        DB에는 amount를 항상 양수로 저장하고,
        화면에 보여줄 때만 지출을 음수로 변환.
        """
        if self.transaction_type == self.EXPENSE:
            return -self.amount

        return self.amount


class FeeReceipt(models.Model):
    """
    영수증 파일 테이블

    하나의 FeeTransaction에 여러 개의 FeeReceipt가 연결될 수 있음.
    """

    # 수입/지출 내역과 연결
    # related_name='receipts' 덕분에
    # 한 거래 내역에 해당하는 영수증 이미지(파일) 여러개 연결 가능
    transaction = models.ForeignKey(
        FeeTransaction, #연결 대상 모델
        on_delete=models.CASCADE, #내역 삭제 시 영수증도 같이 삭제
        related_name='receipts',
    )

    # 실제 파일 저장 필드
    # upload_to='fee_receipts/' 이므로 media/fee_receipts/ 아래 저장됨
    file = models.FileField(
        upload_to='fee_receipts/',
        validators=[validate_receipt_file],
    )

    # 사용자가 올린 원본 파일명 저장
    original_name = models.CharField(max_length=255)

    # 업로드 시각 자동 저장
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_name