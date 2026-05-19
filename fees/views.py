#API 기능 구현
from django.core.exceptions import ValidationError
from django.db import transaction as db_transaction
from django.db.models import Sum
from django.utils import timezone #날짜 계산
from django.utils.dateparse import parse_date

from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import FeeReceipt, FeeTransaction, MemberFeePayment, validate_receipt_file
from club_members.models import ClubMembership

import mimetypes
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.views.decorators.clickjacking import xframe_options_exempt



#프론트에서 넘어온 수입/지출 값 DB용 값으로 변환하는 함수(INCOME, EXPENSE)
def normalize_transaction_type(value):
    if value in ['수입', 'INCOME', 'income']:
        return FeeTransaction.INCOME

    if value in ['지출', 'EXPENSE', 'expense']:
        return FeeTransaction.EXPENSE

    return None


#금액 합계 계산(transaction_type에 따라 +, - 계산)
def get_sum(queryset, transaction_type):
    return queryset.filter(transaction_type=transaction_type).aggregate(
        total=Sum('amount')
    )['total'] or 0

#pdf에서 차단 기능 해제하는 함수(pdf내용 볼 수 있도록 함)
@xframe_options_exempt #iframe 차단 헤더 제거
def fee_receipt_file(request, receipt_id): #id를 통해 증빙자료 파일 확인
    receipt = get_object_or_404(FeeReceipt, id=receipt_id)

    if not receipt.file:
        raise Http404('영수증 파일이 없습니다.')

    content_type, _ = mimetypes.guess_type(receipt.file.name)

    response = FileResponse( #파일을 브라우저에 내려받음
        receipt.file.open('rb'),
        content_type=content_type or 'application/octet-stream',
    )

    #inline방식으로 브라우저 상에 열 수 있도록 하는 코드
    response['Content-Disposition'] = f'inline; filename="{receipt.original_name}"'

    return response


#FeeReceipt 객체를 프론트가 사용할 수 있도록 JSON 형태로 변경하는 함수
def serialize_receipt(receipt, request):
    receipt_url = request.build_absolute_uri(
        f'/api/fees/receipts/{receipt.id}/file/'
    )

    return {
        'id': receipt.id,
        'name': receipt.original_name,
        'url': receipt_url,
    }


#FeeTransaction 객체를 프론트가 사용할 수 있도록 JSON 형태로 변경하는 함수
def serialize_transaction(transaction_obj, request):
    transaction_date = transaction_obj.transaction_date

    if hasattr(transaction_date, 'strftime'):
        formatted_date = transaction_date.strftime('%Y-%m-%d')

    else:
        formatted_date = str(transaction_date)

    return {
        'id': transaction_obj.id,
        'date': formatted_date,
        'type': transaction_obj.get_transaction_type_display(),
        'content': transaction_obj.content,
        'category': transaction_obj.category,
        'amount': transaction_obj.signed_amount, #DB에는 양수로 저장되어있으므로 프론트를 위해 signed_amount사용
        'target': transaction_obj.target,
        'memo': transaction_obj.memo,
        'receipts': [ #영수증 여러 개 JSON배열로 변경 
            serialize_receipt(receipt, request)
            for receipt in transaction_obj.receipts.all()
        ],
    }

#회원의 프로필 정보를 가져오는 함수
def serialize_member_payment(payment):
    profile = getattr(payment.user, 'profile', None) #profile모델을 확인(이름, 학번, 학과)

    if profile:
        name = getattr(profile, 'nickname', '') or payment.user.username
        department = getattr(profile, 'department', '')
        student_id = getattr(profile, 'student_id', '')
    else:
        name = payment.user.get_full_name() or payment.user.username
        department = ''
        student_id = ''

    return {
        'id': payment.id,
        'userId': payment.user.id,
        'name': name,
        'department': department,
        'studentId': student_id,
        'status': payment.get_status_display(), #프론트에 완료 / 미납으로 보여주기 위한 함수코드
        'amount': payment.amount,
        'paidDate': payment.paid_at.strftime('%Y-%m-%d') if payment.paid_at else '-',
        'memo': payment.note,
    }


@api_view(['GET']) #상단의 요약카드에 데이터를 주는 API
def fee_summary(request, club_id): 
    today = timezone.localdate() #오늘 날짜

    #모든 수입/지출 내역 가져오는 코드
    all_transactions = FeeTransaction.objects.filter(club_id=club_id)

    #그 중 이번 달에 해당하는 값들을 필터링하는 함수
    monthly_transactions = all_transactions.filter(
        transaction_date__year=today.year,
        transaction_date__month=today.month,
    )

    total_income = get_sum(all_transactions, FeeTransaction.INCOME)
    total_expense = get_sum(all_transactions, FeeTransaction.EXPENSE)

    monthly_income = get_sum(monthly_transactions, FeeTransaction.INCOME)
    monthly_expense = get_sum(monthly_transactions, FeeTransaction.EXPENSE)

    return Response({
        'balance': total_income - total_expense, #잔액
        'monthlyIncome': monthly_income,
        'monthlyExpense': monthly_expense,
    })

#회원별 납부 현황 조회 API 함수
@api_view(['GET'])
def fee_payments(request, club_id):
    memberships = ( #동아리에 맞는 회원의 목록을 가져오는 코드
        ClubMembership.objects
        .filter(club_id=club_id)
        .select_related('user', 'user__profile')
        .order_by('user__username')
    )

    #동아리원의 납부 데이터가 없다면 미납 상태로 만드는 코드
    for membership in memberships:
        MemberFeePayment.objects.get_or_create(
            club_id=club_id,
            user=membership.user,
            defaults={
                'status': MemberFeePayment.UNPAID,
                'amount': 0,
            },
        )

    payments = (  #화면에 표시할 회원별 납부 목록
        MemberFeePayment.objects
        .filter(club_id=club_id, user__in=[membership.user for membership in memberships])
        .select_related('user', 'user__profile')
        .order_by('user__username')
    )

    status_filter = request.query_params.get('status')
    search = request.query_params.get('search', '').strip()

    if status_filter == '완료':
        payments = payments.filter(status=MemberFeePayment.PAID)

    if status_filter == '미납':
        payments = payments.filter(status=MemberFeePayment.UNPAID)

    if search: #회원 검색(이름만 가능)
        payments = payments.filter(
            user__username__icontains=search
        )

    total_count = payments.count()
    paid_count = payments.filter(status=MemberFeePayment.PAID).count()
    unpaid_count = payments.filter(status=MemberFeePayment.UNPAID).count()
    payment_rate = round((paid_count / total_count) * 100) if total_count else 0

    return Response({ #상단 요약 카드에 필요한 부분
        'summary': {
            'totalMemberCount': total_count, #총 동아리원 수
            'paidMemberCount': paid_count, #납부한 인원 수
            'unpaidMemberCount': unpaid_count, #미납한 인원 수
            'paymentRate': payment_rate, #납부율
        },
        'results': [ #db에 들어있는 값을 JSON형태로 변환, 프론트 통신을 위한 serilize
            serialize_member_payment(payment)
            for payment in payments
        ],
    })


#회원 납부 상태 변경 API
@api_view(['PATCH'])
def fee_payment_detail(request, club_id, payment_id):
    payment = get_object_or_404(
        MemberFeePayment,
        id=payment_id,
        club_id=club_id,
    )

    status_value = request.data.get('status') #프론트에서 온 상태값 읽는 코드

    if status_value in ['완료', 'PAID', 'paid']: #납부 완료 변경 코드
        payment.status = MemberFeePayment.PAID

        #회비 금액 설정 미구현 관계로 3만원 고정 상태(이후 동아리 관리 페이지에서 회비 필드 추가)
        if payment.amount == 0:
            payment.amount = 30000

        if not payment.paid_at: #납부일 비어있다면 해당 날짜 자동 입력
            payment.paid_at = timezone.localdate()

    elif status_value in ['미납', 'UNPAID', 'unpaid']: #미납 변경 코드
        payment.status = MemberFeePayment.UNPAID
        payment.amount = 0
        payment.paid_at = None

    else:
        return Response(
            {'message': '납부 상태 값이 올바르지 않습니다.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment.save()

    #수정 완료된 결과 프론트에 return
    return Response(serialize_member_payment(payment))


@api_view(['GET', 'POST']) #GET은 수입/지출 내역 조회, POST는 내역 등록(영수증 파일 저장)
#MultiPartParser: 파일 포함된 multipart/form-data 요청을 해석,
#FormParser: 일반 Form 방식 요청 해석,
#JSONParser: JSON 방식 요청 해석, 파일 없는 데이터 처리에 사용 가능
@parser_classes([MultiPartParser, FormParser, JSONParser])
def fee_transactions(request, club_id):
    if request.method == 'GET': #최근 내역 반환
        transactions = (
            FeeTransaction.objects
            .filter(club_id=club_id)
            .prefetch_related('receipts') 
        )

        if request.query_params.get('limit') != 'all': #더보기 에서는 전체 내역 요청하도록 함
            transactions = transactions[:5] #최근 내역 5개 가져옴

        return Response({ #내역들은 프론트에서 사용할 수 있는 JSON파일로 변환 후 반환
            'results': [
                serialize_transaction(transaction_obj, request)
                for transaction_obj in transactions
            ]
        })

    #POSt인 경우 처리 부분
    transaction_type = normalize_transaction_type(
        request.data.get('transaction_type') #수입/지출 값 DB용으로 변경
    )
    transaction_date = request.data.get('date')
    content = request.data.get('content')
    category = request.data.get('category')
    amount = request.data.get('amount')
    target = request.data.get('target', '')
    memo = request.data.get('memo', '')

    if not transaction_type:
        return Response(
            {'message': '수입 또는 지출 구분이 올바르지 않습니다.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not transaction_date or not content or not category or not amount:
        return Response(
            {'message': '날짜, 내용, 카테고리, 금액은 필수입니다.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    parsed_transaction_date = parse_date(transaction_date)

    if not parsed_transaction_date:
        return Response(
            {'message': '날짜 형식이 올바르지 않습니다.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        amount = int(amount)
    except ValueError:
        return Response(
            {'message': '금액은 숫자로 입력해야 합니다.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if amount <= 0:
        return Response(
            {'message': '금액은 0보다 커야 합니다.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    #영수증 파일 모두 가져오는 코드
    receipt_files = request.FILES.getlist('receipts')

    for receipt_file in receipt_files:
        try:
            validate_receipt_file(receipt_file)
        except ValidationError as error:
            return Response(
                {'message': error.messages[0]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    with db_transaction.atomic(): #하나의 작업 묶음으로 처리, 해당 블록 안 작업들은 하나의 작업으로 간주, 한 가지라도 실패한다면 아무것도 하지 않은상태로 되돌림
        transaction_obj = FeeTransaction.objects.create( #db에 저장하는 부분
            club_id=club_id,
            transaction_type=transaction_type,
            transaction_date=parsed_transaction_date,
            content=content,
            category=category,
            amount=amount,
            target=target,
            memo=memo,
            created_by=request.user if request.user.is_authenticated else None,
        )

        #업로드된 영수증 파일 하나씩 저장하는 함수
        for receipt_file in receipt_files:
            FeeReceipt.objects.create(
                transaction=transaction_obj,
                file=receipt_file,
                original_name=receipt_file.name,
            )

    return Response(
        serialize_transaction(transaction_obj, request),
        status=status.HTTP_201_CREATED,
    )