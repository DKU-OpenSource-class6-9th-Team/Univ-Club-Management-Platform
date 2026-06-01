"""
동아리 건강도 분석 서비스 파일

역할:
1. 동아리 운영 데이터를 기반으로 건강도 점수 계산
2. 프론트 건강도 분석 페이지에 필요한 응답 구조 생성
3. 아직 구현되지 않은 일정/AI/월별 추이 기능은 확장 가능한 기본 구조만 제공

주의:
- 현재는 AI 라이브러리를 사용하지 않음.
- Isolation Forest 등 ML 모델은 추후 이 파일의 ai_notice 관련 함수 내부에 연결 예정.
"""
from django.db.models import Avg, Sum

from club_members.models import ClubMembership as ManagedClubMembership
from clubs.models import BiweeklySurvey, BiweeklySurveyResponse
from fees.models import FeeTransaction, MemberFeePayment
from events.models import Event, EventApplication, Attendance
from clubs.services.health_ML_notice import build_ai_notice


#점수를 0~100 범위 안으로 제한하는 함수
def clamp(value, min_value=0, max_value=100):
    return max(min_value, min(value, max_value))


#part / total 값을 퍼센트로 변환
def percent(part, total):
    if not total:
        return 0

    return round((part / total) * 100)


#점수에 따라 화면에 표시할 상태 반환
def get_status_label(score):
    if score >= 90:
        return "매우 우수"

    if score >= 70:
        return "양호"

    if score >= 50:
        return "보통"

    return "주의"


#가장 최근 만족도 조사 데이터 가져오는 함수
def get_latest_survey(club):
    return (
        BiweeklySurvey.objects
        .filter(club=club)
        .order_by("-year", "-month", "-round_number")
        .first()
    )


#1~5점 만족도 점수 리스트의 평균을 계산
def average_score(scores):
    if not scores:
        return None

    return round(sum(scores) / len(scores), 1)


#5점 만점 만족도 점수를 100점 만점으로 변환
def convert_five_point_to_100(score):
    if score is None:
        return 0

    return round((score / 5) * 100)


#활동/일정 운영성 점수 계산에 포함할 일정 유형
SCHEDULE_HEALTH_EVENT_TYPES = [
    Event.EVENT_TYPE_REGULAR,
    Event.EVENT_TYPE_ACTIVITY,
    Event.EVENT_TYPE_PROJECT,
]


#전체 활동 회원 중 80% 이상이 일정에 1회 이상 실제 참여하면 만점으로 본다.
#80% 아래부터는 비율에 따라 점진적으로 감점한다.
SCHEDULE_ACTIVITY_TARGET_RATE = 80


#회원 활동성 지표 계산
def build_member_metrics(club):
    """
     사용 가능한 데이터:
    - club_members_clubmembership
    - 회원 상태(status)
    - 회원 활동 점수(activity_score)

    현재 계산 방식:
    - 활동 상태 회원 비율
    - activity_score 평균
    """
    members = ManagedClubMembership.objects.filter(club=club)

    total_count = members.count()

    # 현재 활동 중이라고 볼 수 있는 회원 상태
    active_count = members.filter(status__in=["new", "regular"]).count()

    # 휴면, 탈퇴, 제한 회원 등 운영상 주의가 필요한 상태
    inactive_count = members.filter(
        status__in=["inactive", "withdrawn", "restricted"]
    ).count()

    active_rate = percent(active_count, total_count)

    avg_activity_score = (
        members.aggregate(avg=Avg("activity_score"))["avg"] or 0
    )

    # 현재는 간단한 공식 기반 계산
    # 활동 회원 비율 80% + 활동 점수 평균 20%
    member_score = round(
        active_rate * 0.8 + clamp(avg_activity_score) * 0.2
    )

    return {
        "dataReady": total_count > 0,
        "score": member_score,
        "maxScore": 100,
        "status": get_status_label(member_score),

        "activeRate": active_rate,
        "totalMemberCount": total_count,
        "activeMemberCount": active_count,
        "inactiveMemberCount": inactive_count,
        "averageActivityScore": round(avg_activity_score, 1),
    }


#재정 운영 투명성 계산
def build_finance_metrics(club, satisfaction):
    """
    사용 데이터:
    - MemberFeePayment: 회원별 회비 납부 현황
    - FeeTransaction: 회비 수입/지출 내역
    - FeeReceipt: 증빙자료 첨부 여부
    - satisfaction["feeAverage"]: 회비 사용 만족도 평균

    계산 방식:
    - 회비 만족도 데이터가 있는 경우:
      회비 납부율 20% + 증빙자료 첨부율 40% + 회비 만족도 40%

    - 회비 만족도 데이터가 없는 경우:
      회비 납부율 33.3% + 증빙자료 첨부율 66.7%
    """
    transactions = (
        FeeTransaction.objects
        .filter(club_id=club.id)
        .prefetch_related("receipts")
    )

    payments = MemberFeePayment.objects.filter(club_id=club.id)

    total_payment_count = payments.count()
    paid_count = payments.filter(status=MemberFeePayment.PAID).count()
    unpaid_count = payments.filter(status=MemberFeePayment.UNPAID).count()

    payment_rate = percent(paid_count, total_payment_count)
    unpaid_rate = percent(unpaid_count, total_payment_count)

    total_transaction_count = transactions.count()

    # 수입/지출 내역 중 증빙자료가 하나 이상 연결된 거래 수
    receipt_attached_count = sum(
        1 for transaction in transactions
        if transaction.receipts.exists()
    )

    receipt_rate = percent(receipt_attached_count, total_transaction_count)

    total_income = (
        transactions
        .filter(transaction_type=FeeTransaction.INCOME)
        .aggregate(total=Sum("amount"))["total"] or 0
    )

    total_expense = (
        transactions
        .filter(transaction_type=FeeTransaction.EXPENSE)
        .aggregate(total=Sum("amount"))["total"] or 0
    )

    balance = total_income - total_expense

    # 회비 사용 만족도 평균
    fee_average = satisfaction.get("feeAverage")
    fee_satisfaction_score = convert_five_point_to_100(fee_average)

    has_fee_satisfaction = fee_average is not None

    if has_fee_satisfaction:
        # 회비 만족도 데이터가 있을 때의 최종 공식
        finance_score = round(
            payment_rate * 0.20
            + receipt_rate * 0.40
            + fee_satisfaction_score * 0.40
        )

        score_formula = "PAYMENT_20_RECEIPT_40_FEE_SATISFACTION_40"
    else:
        # 회비 만족도 데이터가 없을 때는 납부율/증빙자료만으로 부분 산정
        finance_score = round(
            payment_rate * 0.3333
            + receipt_rate * 0.6667
        )

        score_formula = "PAYMENT_RECEIPT_ONLY"

    return {
        "dataReady": total_payment_count > 0 or total_transaction_count > 0,
        "score": finance_score,
        "maxScore": 100,
        "status": get_status_label(finance_score),

        "paymentRate": payment_rate,
        "unpaidRate": unpaid_rate,
        "receiptRate": receipt_rate,

        "feeSatisfactionAverage": fee_average,
        "feeSatisfactionScore": fee_satisfaction_score,
        "feeSatisfactionReady": has_fee_satisfaction,

        # 잔액은 점수 계산에는 사용하지 않고 참고 정보로만 제공
        "balance": balance,
        "totalIncome": total_income,
        "totalExpense": total_expense,

        "paidMemberCount": paid_count,
        "unpaidMemberCount": unpaid_count,
        "totalPaymentCount": total_payment_count,

        "receiptAttachedCount": receipt_attached_count,
        "totalTransactionCount": total_transaction_count,

        "scoreFormula": score_formula,
    }


#만족도 및 피드백 지표 계산
def build_satisfaction_metrics(club):
    """
    현재 사용 가능한 데이터:
    - BiweeklySurvey
    - BiweeklySurveyResponse

    현재 계산 방식:
    - 일정 만족도 평균
    - 회비 사용 만족도 평균
    - 전체 응답률
    """
    survey = get_latest_survey(club)

    if not survey:
        return {
            "dataReady": False,
            "score": 0,
            "maxScore": 100,
            "status": "데이터 없음",

            "scheduleAverage": None,
            "feeAverage": None,
            "overallAverage": None,

            "responseRate": 0,
            "submittedCount": 0,
            "targetCount": 0,
        }

    responses = survey.responses.filter(
        status=BiweeklySurveyResponse.STATUS_SUBMITTED
    )

    target_count = ManagedClubMembership.objects.filter(club=club).count()
    submitted_count = responses.count()
    response_rate = percent(submitted_count, target_count)

    schedule_item_ids = {
        str(item.get("id")) for item in survey.schedule_items
    }

    fee_item_ids = {
        str(item.get("id")) for item in survey.fee_items
    }

    schedule_scores = []
    fee_scores = []

    for response in responses:
        answers = response.answers or {}

        for item_id, score in answers.items():
            try:
                numeric_score = int(score)
            except (TypeError, ValueError):
                continue

            if str(item_id) in schedule_item_ids:
                schedule_scores.append(numeric_score)

            if str(item_id) in fee_item_ids:
                fee_scores.append(numeric_score)

    schedule_average = average_score(schedule_scores)
    fee_average = average_score(fee_scores)

    all_scores = schedule_scores + fee_scores
    overall_average = average_score(all_scores)

    # 만족도 점수 공식
    # 만족도 평균 70% + 응답률 30%
    satisfaction_score = round(
        convert_five_point_to_100(overall_average) * 0.7
        + response_rate * 0.3
    )

    return {
        "dataReady": bool(all_scores),
        "score": satisfaction_score,
        "maxScore": 100,
        "status": get_status_label(satisfaction_score),

        "scheduleAverage": schedule_average,
        "feeAverage": fee_average,
        "overallAverage": overall_average,

        "responseRate": response_rate,
        "submittedCount": submitted_count,
        "targetCount": target_count,
    }


#일정 및 출석 데이터를 기반으로 활동/일정 운영성의 객관 지표 계산
def build_schedule_operation_metrics(club):
    """
    사용 데이터:
    - Event: 일정 상태, 일정 유형
    - EventApplication: 일정 참여 신청 데이터
    - Attendance: 참석, 지각 데이터
    - ManagedClubMembership: 전체 활동 회원 수

    계산 지표:
    - 일정 활동 인원 비율
    - 일정 활동 인원 비율 점수
    - 신청자 대비 실제 출석률
    - 일정 운영 안정성
    """
    events = Event.objects.filter(
        club=club,
        event_type__in=SCHEDULE_HEALTH_EVENT_TYPES,
    )

    completed_events = events.filter(status=Event.STATUS_COMPLETED)
    canceled_events = events.filter(status=Event.STATUS_CANCELED)

    completed_count = completed_events.count()
    canceled_count = canceled_events.count()

    active_members = ManagedClubMembership.objects.filter(
        club=club,
        status__in=["new", "regular"],
    )

    active_member_count = active_members.count()

    attendances = Attendance.objects.filter(
        event__in=completed_events,
    )

    attended_attendances = attendances.filter(
        status__in=[
            Attendance.STATUS_PRESENT,
            Attendance.STATUS_LATE,
        ]
    )

    unique_attended_member_count = (
        attended_attendances
        .values("user_id")
        .distinct()
        .count()
    )

    # 전체 활동 회원 중 일정에 1회 이상 실제 참석한 회원 비율
    schedule_activity_rate = clamp(
    percent(
        unique_attended_member_count,
        active_member_count,
    )
)

    # 80% 이상이면 100점, 그 아래는 점진적으로 감점
    schedule_activity_score = 0

    if active_member_count > 0:
        schedule_activity_score = round(
            min(
                (schedule_activity_rate / SCHEDULE_ACTIVITY_TARGET_RATE) * 100, 100,
            )
        )

    applications = EventApplication.objects.filter(
        event__in=completed_events,
        status=EventApplication.STATUS_APPLIED,
    )

    total_applied_count = applications.count()
    total_attended_count = attended_attendances.count()

    # 신청자 대비 실제 출석률
    actual_attendance_rate = clamp(
    percent(
        total_attended_count,
        total_applied_count,
    )
)

    # 완료 및 취소 일정 중 실제 완료된 일정 비율
    schedule_stability_rate = clamp(
    percent(
        completed_count,
        completed_count + canceled_count,
    )
)

    return {
        "dataReady": completed_count > 0 or canceled_count > 0,

        "totalEventCount": events.count(),
        "completedEventCount": completed_count,
        "canceledEventCount": canceled_count,

        "activeMemberCount": active_member_count,
        "uniqueAttendedMemberCount": unique_attended_member_count,

        "scheduleActivityRate": schedule_activity_rate,
        "scheduleActivityScore": schedule_activity_score,

        "totalAppliedCount": total_applied_count,
        "totalAttendedCount": total_attended_count,
        "actualAttendanceRate": actual_attendance_rate,

        "scheduleStabilityRate": schedule_stability_rate,
    }


#활동/일정 운영성 지표
def build_schedule_metrics(club, satisfaction):
    """
    계산 방식:
    - 활동/일정 만족도 35%
    - 전체 활동 회원 대비 일정 활동 인원 비율 35%
    - 신청자 대비 실제 출석률 20%
    - 일정 운영 안정성 10%

    일부 데이터가 아직 없는 경우에는 준비된 데이터만 기준으로 계산.
    """
    schedule_average = satisfaction.get("scheduleAverage")
    schedule_satisfaction_score = convert_five_point_to_100(schedule_average)

    operation = build_schedule_operation_metrics(club)

    has_satisfaction = schedule_average is not None
    has_operation_data = operation["dataReady"]

    weighted_items = []

    if has_satisfaction:
        weighted_items.append((
            schedule_satisfaction_score,
            0.35,
        ))

    if has_operation_data:
        weighted_items.append((
            operation["scheduleActivityScore"],
            0.35,
        ))

        weighted_items.append((
            operation["actualAttendanceRate"],
            0.20,
        ))

        weighted_items.append((
            operation["scheduleStabilityRate"],
            0.10,
        ))

    if not weighted_items:
        return {
            "dataReady": False,
            "score": 0,
            "maxScore": 100,
            "status": "데이터 없음",

            "scheduleSatisfactionReady": False,
            "scheduleSatisfactionAverage": None,
            "scheduleSatisfactionScore": 0,

            "scheduleActivityRate": 0,
            "scheduleActivityScore": 0,
            "actualAttendanceRate": 0,
            "scheduleStabilityRate": 0,

            "message": "활동/일정 만족도 및 일정 운영 데이터 연동 후 계산 예정입니다.",
            "operation": operation,
        }

    score_sum = sum(score * weight for score, weight in weighted_items)
    weight_sum = sum(weight for score, weight in weighted_items)

    schedule_score = round(score_sum / weight_sum)

    return {
        "dataReady": True,
        "score": schedule_score,
        "maxScore": 100,
        "status": get_status_label(schedule_score),

        "scheduleSatisfactionReady": has_satisfaction,
        "scheduleSatisfactionAverage": schedule_average,
        "scheduleSatisfactionScore": schedule_satisfaction_score,

        "scheduleActivityRate": operation["scheduleActivityRate"],
        "scheduleActivityScore": operation["scheduleActivityScore"],

        "actualAttendanceRate": operation["actualAttendanceRate"],
        "scheduleStabilityRate": operation["scheduleStabilityRate"],

        "operation": operation,

        "message": (
            "활동/일정 만족도, 일정 활동 인원 비율, "
            "신청자 대비 실제 출석률, 일정 운영 안정성을 기준으로 산정되었습니다."
        ),
    }



#월별 건강도 추이
def build_monthly_trend(club):
    """
    현재 상태:
    - 월별 건강도 점수를 저장하는 Snapshot 테이블이 없음.
    - 따라서 빈 배열을 반환한다.

    추후 구현 방향:
    - ClubHealthSnapshot 모델 생성
    - 월별 전체 건강도 점수 저장
    - 최근 3개월 또는 6개월 추이 반환
    """
    return []


#전체 건강도 점수 계산
def calculate_total_score(metrics):
    """
    현재 방식:
    - dataReady=True인 영역만 계산에 포함
    - 만족도 데이터는 독립 영역으로 계산하지 않음
      활동/일정 운영성과 재정 운영 투명성에 흡수
    - 데이터가 없는 영역은 0점 처리하지 않고 계산에서 제외
    """
    weighted_items = [
        ("member", 0.30),
        ("schedule", 0.30),
        ("finance", 0.40),
    ]

    score_sum = 0
    weight_sum = 0

    for key, weight in weighted_items:
        metric = metrics[key]

        if not metric["dataReady"]:
            continue

        score_sum += metric["score"] * weight
        weight_sum += weight

    if weight_sum == 0:
        return 0

    return round(score_sum / weight_sum)


#건강도 분석 API의 최종 응답 데이터를 생성하는 함수
def build_health_analysis_payload(club):
    """
    views.py에서는 이 함수만 호출.

    반환 데이터:
    - 전체 건강도
    - 상단 요약 카드
    - 영역별 점수
    - 건강도 영향 지표
    - 만족도 요약
    - 재정 상세 지표
    - AI 이상 탐지 구조
    - 월별 추이 구조
    """
    member = build_member_metrics(club)
    satisfaction = build_satisfaction_metrics(club) #만족도 데이터
    schedule = build_schedule_metrics(club, satisfaction) #활동/일정 운영성
    finance = build_finance_metrics(club, satisfaction) #재정 운영 투명성

    metrics = {
        "member": member,
        "schedule": schedule,
        "satisfaction": satisfaction,
        "finance": finance,
    }

    total_score = calculate_total_score(metrics)
    total_status = get_status_label(total_score)

    return {
        "totalHealth": {
            "score": total_score,
            "maxScore": 100,
            "status": total_status,
        },

        "summaryCards": [
            {
                "key": "total",
                "title": "전체 건강도",
                "score": total_score,
                "maxScore": 100,
                "status": total_status,
                "dataReady": True,
            },
            {
                "key": "member",
                "title": "회원 활동성",
                "score": member["score"],
                "maxScore": 100,
                "status": member["status"],
                "dataReady": member["dataReady"],
            },
            {
                "key": "schedule",
                "title": "활동/일정 운영성",
                "score": schedule["score"],
                "maxScore": 100,
                "status": schedule["status"],
                "dataReady": schedule["dataReady"],
            },
            {
                "key": "finance",
                "title": "재정 운영 투명성",
                "score": finance["score"],
                "maxScore": 100,
                "status": finance["status"],
                "dataReady": finance["dataReady"],
                "description": (
                    f"회비 납부율 {finance['paymentRate']}%, "
                    f"증빙자료 첨부율 {finance['receiptRate']}%"
                ),
            },
        ],

        "domainScores": [
            {
                "key": "member",
                "title": "회원 활동성",
                "score": member["score"],
                "maxScore": 100,
                "status": member["status"],
                "dataReady": member["dataReady"],
                "description": f"회원 활동률 {member['activeRate']}%",
            },
            {
                "key": "schedule",
                "title": "활동/일정 운영성",
                "score": schedule["score"],
                "maxScore": 100,
                "status": schedule["status"],
                "dataReady": schedule["dataReady"],
                "description": schedule["message"],
            },
            {
                "key": "finance",
                "title": "재정 운영 투명성",
                "score": finance["score"],
                "maxScore": 100,
                "status": finance["status"],
                "dataReady": finance["dataReady"],
                "description": f"회비 납부율 {finance['paymentRate']}%",
            },
        ],

        "impactIndicators": [
            {
                "key": "memberActiveRate",
                "title": "활동 회원 비율",
                "value": member["activeRate"],
                "unit": "%",
                "status": get_status_label(member["activeRate"]),
                "dataReady": member["dataReady"],
                "description": "",
            },
            {
                "key": "memberAverageActivityScore",
                "title": "회원 활동 점수 평균",
                "value": member["averageActivityScore"],
                "unit": "점",
                "status": get_status_label(member["averageActivityScore"]),
                "dataReady": member["dataReady"],
                "description": "",
            },
            {
                "key": "scheduleSatisfaction",
                "title": "활동/일정 만족도",
                "value": schedule["scheduleSatisfactionAverage"] or 0,
                "unit": "/5.0",
                "status": get_status_label(schedule["scheduleSatisfactionScore"]),
                "dataReady": schedule["scheduleSatisfactionReady"],
                "description": "",
            },
            {
                "key": "scheduleActivityRate",
                "title": "일정 활동 인원 비율",
                "value": schedule["scheduleActivityRate"],
                "unit": "%",
                "status": get_status_label(schedule["scheduleActivityScore"]),
                "dataReady": schedule["dataReady"],
                "description": "",
            },
            {
                "key": "actualAttendanceRate",
                "title": "신청자 대비 실제 출석률",
                "value": schedule["actualAttendanceRate"],
                "unit": "%",
                "status": get_status_label(schedule["actualAttendanceRate"]),
                "dataReady": schedule["dataReady"],
                "description": "",
            },
            {
                "key": "scheduleStabilityRate",
                "title": "일정 운영 안정성",
                "value": schedule["scheduleStabilityRate"],
                "unit": "%",
                "status": get_status_label(schedule["scheduleStabilityRate"]),
                "dataReady": schedule["dataReady"],
                "description": "",
            },
            {
                "key": "paymentRate",
                "title": "회비 납부율",
                "value": finance["paymentRate"],
                "unit": "%",
                "status": get_status_label(finance["paymentRate"]),
                "dataReady": finance["dataReady"],
                "description": "",
            },
            {
                "key": "receiptRate",
                "title": "증빙자료 첨부율",
                "value": finance["receiptRate"],
                "unit": "%",
                "status": get_status_label(finance["receiptRate"]),
                "dataReady": finance["dataReady"],
                "description": "",
            },
            {
                "key": "feeSatisfaction",
                "title": "회비 사용 만족도",
                "value": finance["feeSatisfactionAverage"] or 0,
                "unit": "/5.0",
                "status": get_status_label(finance["feeSatisfactionScore"]),
                "dataReady": finance["feeSatisfactionReady"],
                "description": "",
            },
        ],

        "satisfactionSummary": {
            "scheduleAverage": satisfaction["scheduleAverage"],
            "feeAverage": satisfaction["feeAverage"],
            "responseRate": satisfaction["responseRate"],
            "dataReady": satisfaction["dataReady"],
        },

        "financeDetail": {
            "paymentRate": finance["paymentRate"],
            "unpaidRate": finance["unpaidRate"],
            "receiptRate": finance["receiptRate"],

            "feeSatisfactionAverage": finance["feeSatisfactionAverage"],
            "feeSatisfactionScore": finance["feeSatisfactionScore"],
            "feeSatisfactionReady": finance["feeSatisfactionReady"],

            # 잔액은 점수 계산에는 사용하지 않고 참고 정보로만 제공
            "balance": finance["balance"],
            "totalIncome": finance["totalIncome"],
            "totalExpense": finance["totalExpense"],

            "scoreFormula": finance["scoreFormula"],
            "dataReady": finance["dataReady"],
        },

        "aiNotice": build_ai_notice(metrics),

        "monthlyTrend": build_monthly_trend(club),
    }
