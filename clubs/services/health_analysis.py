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
from clubs.models import (
    BiweeklySurvey,
    BiweeklySurveyResponse,
    SurveyState,
    SurveyItem,
    SurveySubmission,
    Club,
)
from fees.models import FeeTransaction, MemberFeePayment
from events.models import Event, EventApplication, Attendance
from clubs.services.health_notice import (
    FEATURE_COLUMNS,
    MIN_USED_FEATURE_COUNT,
    build_ai_notice,
    build_current_club_feature_vector,
)


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
    KAN-65 기준:
    - 건강도 분석 페이지의 만족도 값은 만족도 조사 페이지와 동일하게 순수 평균 평점을 사용
    - 응답률은 점수에 섞지 않고 별도 지표로 유지


    KAN-63 이후 새 만족도 조사 데이터
       - SurveyItem
       - SurveySubmission
       - SurveyState"""

    # 새 만족도 조사 데이터 기준 계산
    survey_items = SurveyItem.objects.filter(club=club)

    submissions = SurveySubmission.objects.filter(
        club=club,
        has_submitted=True,
    )

    has_new_survey_data = survey_items.exists() or submissions.exists()

    if has_new_survey_data:
        state = SurveyState.objects.filter(club=club).first()

        # 현재 조사 버전의 제출 결과만 건강도 분석에 반영
        if state is not None:
            submissions = submissions.filter(
                submitted_version=state.survey_version
            )

        target_count = (
            ManagedClubMembership.objects
            .filter(club=club)
            .exclude(status="withdrawn")
            .count()
        )

        submitted_count = submissions.values("user").distinct().count()
        response_rate = percent(submitted_count, target_count)

        schedule_item_ids = {
            f"{SurveyItem.TYPE_SCHEDULE}-{original_id}"
            for original_id in (
                survey_items
                .filter(item_type=SurveyItem.TYPE_SCHEDULE)
                .values_list("original_id", flat=True)
            )
        }

        fee_item_ids = {
            f"{SurveyItem.TYPE_FEE}-{original_id}"
            for original_id in (
                survey_items
                .filter(item_type=SurveyItem.TYPE_FEE)
                .values_list("original_id", flat=True)
            )
        }

        schedule_scores = []
        fee_scores = []

        for submission in submissions:
            answers = submission.answers or {}

            for item_id, score in answers.items():
                try:
                    numeric_score = int(score)
                except (TypeError, ValueError):
                    continue

                if numeric_score < 1 or numeric_score > 5:
                    continue

                item_key = str(item_id)

                if item_key in schedule_item_ids:
                    schedule_scores.append(numeric_score)

                if item_key in fee_item_ids:
                    fee_scores.append(numeric_score)

        schedule_average = average_score(schedule_scores)
        fee_average = average_score(fee_scores)

        all_scores = schedule_scores + fee_scores
        overall_average = average_score(all_scores)

        # 만족도 점수 공식
        # 만족도 조사 페이지와 동일하게 1~5점 평균을 100점 만점으로 단순 환산
        satisfaction_score = convert_five_point_to_100(overall_average)

        return {
            "dataReady": bool(all_scores),
            "score": satisfaction_score,
            "maxScore": 100,
            "status": (
                get_status_label(satisfaction_score)
                if all_scores
                else "데이터 없음"
            ),

            "scheduleAverage": schedule_average,
            "feeAverage": fee_average,
            "overallAverage": overall_average,

            "responseRate": response_rate,
            "submittedCount": submitted_count,
            "targetCount": target_count,
        }

    # 2. 새 만족도 데이터가 아예 없으면 기존 BiweeklySurvey 방식 사용
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

            if numeric_score < 1 or numeric_score > 5:
                continue

            if str(item_id) in schedule_item_ids:
                schedule_scores.append(numeric_score)

            if str(item_id) in fee_item_ids:
                fee_scores.append(numeric_score)

    schedule_average = average_score(schedule_scores)
    fee_average = average_score(fee_scores)

    all_scores = schedule_scores + fee_scores
    overall_average = average_score(all_scores)

    # 기존 데이터도 만족도 조사 페이지와 동일하게 평균 점수를 100점 만점으로 단순 환산
    satisfaction_score = convert_five_point_to_100(overall_average)

    return {
        "dataReady": bool(all_scores),
        "score": satisfaction_score,
        "maxScore": 100,
        "status": (
            get_status_label(satisfaction_score)
            if all_scores
            else "데이터 없음"
        ),

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


# 최종 평가 코멘트에서 영역 key를 사용자에게 보여줄 이름으로 변환
DOMAIN_LABELS = {
    "member": "회원 활동성",
    "schedule": "활동/일정 운영성",
    "finance": "재정 운영 투명성",
}

# 동아리별 지표 비교 Notice 결과에서 high / low 분리
def extract_notice_features(ai_notice):
    """
    역할:
    - aiNotice는 세부 지표별 비교 결과
    - finalComment는 이 중 핵심 high / low 지표만 요약해서 사용
    - Notice 문장을 그대로 반복하지 않음, 최종 해석에 필요한 지표 이름만 추출
    """
    deviations = ai_notice.get("deviations", [])

    high_features = [
        item for item in deviations
        if item.get("direction") == "high"
    ]

    low_features = [
        item for item in deviations
        if item.get("direction") == "low"
    ]

    # z-score 절댓값이 큰 지표를 우선 언급한다.
    high_features = sorted(
        high_features,
        key=lambda item: abs(item.get("zScore", 0)),
        reverse=True,
    )

    low_features = sorted(
        low_features,
        key=lambda item: abs(item.get("zScore", 0)),
        reverse=True,
    )

    return high_features, low_features


#최종 평가 코멘트 생성 함수
def build_final_comment(metrics, total_score, total_status, ai_notice):
    """
    전체 건강도, 영역별 점수, 동아리별 지표 비교 Notice를 종합,
    바로 읽을 수 있는 문장형 최종 평가 코멘트를 만듬
    - 건강도 점수를 새로 계산하지 않음
    - 기존 total_score를 그대로 사용
    - aiNotice 결과를 점수에 반영하지 않음
    """
    domain_items = []

    for key in ["member", "schedule", "finance"]:
        metric = metrics[key]

        if not metric.get("dataReady"):
            continue

        domain_items.append({
            "key": key,
            "label": DOMAIN_LABELS[key],
            "score": metric["score"],
            "status": metric["status"],
        })

    if not domain_items:
        return {
            "enabled": False,
            "title": "최종 평가 코멘트",
            "summary": "최종 평가를 위한 데이터가 부족합니다.",
            "description": (
                "현재 동아리는 건강도 분석에 필요한 회원, 일정, 회비, 만족도 데이터가 "
                "충분히 준비되지 않았습니다. 데이터를 먼저 누적한 뒤 다시 건강도 분석을 "
                "확인해야 합니다."
            ),
            "priority": (
                "회원 정보, 일정 출석 데이터, 회비 납부 및 증빙자료, 만족도 조사 응답을 "
                "우선적으로 등록하십시오."
            ),
            "highestDomain": None,
            "lowestDomain": None,
            "strengths": [],
            "improvements": [],
        }

    highest_domain = max(domain_items, key=lambda item: item["score"])
    lowest_domain = min(domain_items, key=lambda item: item["score"])
    domain_gap = highest_domain["score"] - lowest_domain["score"]

    high_features, low_features = extract_notice_features(ai_notice)

    strength_labels = [item["label"] for item in high_features[:2]]
    improvement_labels = [item["label"] for item in low_features[:2]]

    # 전체 건강도 점수 기준 summary.
    if total_score >= 90:
        if low_features:
            summary = "전반적으로 우수하지만 일부 지표 점검이 필요합니다."
        else:
            summary = "전반적으로 매우 안정적인 운영 상태입니다."
    elif total_score >= 70:
        if high_features and low_features:
            summary = "강점과 보완점이 함께 확인되는 운영 상태입니다."
        elif high_features:
            summary = "전반적으로 양호하며 일부 강점 지표가 확인됩니다."
        elif low_features:
            summary = "전반적으로 양호하지만 일부 지표 보완이 필요합니다."
        else:
            summary = "전반적으로 양호한 운영 상태입니다."
    elif total_score >= 50:
        summary = "일부 운영 지표에 대한 점검이 필요한 상태입니다."
    else:
        summary = "운영 전반에 대한 집중적인 개선이 필요한 상태입니다."

    # 본문은 카드 안에서 바로 읽히도록 핵심 근거만 압축한다.
    description_parts = [
        f"현재 동아리의 전체 건강도는 {total_score}점으로 '{total_status}' 수준입니다."
    ]

    if domain_gap >= 15:
        description_parts.append(
            f"{highest_domain['label']}은 강점으로 확인되지만, "
            f"{lowest_domain['label']}은 우선 점검이 필요합니다."
        )
    else:
        description_parts.append(
            "영역별 점수 차이가 크지 않아 전반적으로 균형 있는 운영 흐름을 보입니다."
        )

    representative_strength = strength_labels[0] if strength_labels else None
    representative_improvement = (
        improvement_labels[0] if improvement_labels else None
    )

    if representative_strength and representative_improvement:
        description_parts.append(
            f"비교 지표에서는 {representative_strength}이 강점으로, "
            f"{representative_improvement}이 보완 항목으로 확인됩니다."
        )
    elif representative_strength:
        description_parts.append(
            f"비교 지표에서는 {representative_strength}이 대표 강점으로 확인됩니다."
        )
    elif representative_improvement:
        description_parts.append(
            f"비교 지표에서는 {representative_improvement}이 대표 보완 항목으로 확인됩니다."
        )

    # priority 문장 생성
    if improvement_labels:
        priority = (
            f"우선적으로 {', '.join(improvement_labels)} 항목을 점검하고, "
            "관련 운영 데이터를 꾸준히 누적해 주십시오."
        )
    elif domain_gap >= 15:
        priority = (
            f"{lowest_domain['label']} 영역이 다른 영역보다 낮게 나타나므로, "
            "해당 영역의 세부 지표를 우선 확인하는 것을 추천합니다."
        )
    elif total_score >= 90:
        priority = (
            "현재의 안정적인 운영 흐름을 유지하면서, 참여도와 회비 관리 수준이 "
            "지속될 수 있도록 정기적으로 점검하는 것을 추천합니다."
        )
    elif total_score < 50:
        priority = (
            "전체 건강도 점수가 낮은 상태이므로 회원 활동, 일정 운영, 회비 관리 전반을 "
            "함께 점검하고 개선 계획을 우선 수립하는 것을 추천합니다."
        )
    elif total_score < 70:
        priority = (
            "일부 운영 지표가 보통 수준에 머물러 있으므로, 점수가 낮은 세부 지표부터 "
            "원인을 확인하고 단계적으로 개선하는 것을 추천합니다."
        )
    else:
        priority = (
            "현재의 운영 흐름을 유지하면서, 상대적으로 낮은 세부 지표를 중심으로 "
            "점진적인 개선 계획을 세우는 것을 추천합니다."
        )

    return {
        "enabled": True,
        "title": "최종 평가 코멘트",
        "summary": summary,
        "description": " ".join(description_parts),
        "priority": priority,
        "highestDomain": highest_domain,
        "lowestDomain": lowest_domain,
        "strengths": strength_labels,
        "improvements": improvement_labels,
    }

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

#한 동아리의 건강도 계산에 필요한 영역별 metrics를 생성
def build_health_metrics(club):
    """
    점수 계산과 Notice 비교 기준 생성을 모두 위해 사용
    """
    member = build_member_metrics(club)
    satisfaction = build_satisfaction_metrics(club)
    schedule = build_schedule_metrics(club, satisfaction)
    finance = build_finance_metrics(club, satisfaction)

    return {
        "member": member,
        "schedule": schedule,
        "satisfaction": satisfaction,
        "finance": finance,
    }

#플랫폼에 등록된 다른 동아리들의 실제 데이터을 Notice 비교 기준 feature row로 변환
def build_actual_club_feature_rows(current_club):
    """
    현재 분석 중인 동아리는 비교 기준에서 제외
    데이터가 부족한 동아리는 비교 기준에서 제외
    """
    actual_feature_rows = []

    comparison_clubs = Club.objects.exclude(id=current_club.id)

    for comparison_club in comparison_clubs:
        try:
            metrics = build_health_metrics(comparison_club)

            feature_values, missing_features = build_current_club_feature_vector(
                metrics
            )

            used_feature_count = len(FEATURE_COLUMNS) - len(missing_features)

            if used_feature_count < MIN_USED_FEATURE_COUNT:
                continue

            actual_feature_rows.append(feature_values)

        except Exception as error:
            print(
                f"[health notice] 실제 동아리 비교 데이터 생성 실패: "
                f"club_id={comparison_club.id}, error={error}"
            )

    return actual_feature_rows


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
    metrics = build_health_metrics(club)

    member = metrics["member"]
    schedule = metrics["schedule"]
    satisfaction = metrics["satisfaction"]
    finance = metrics["finance"]

    total_score = calculate_total_score(metrics)
    total_status = get_status_label(total_score)


    actual_feature_rows = build_actual_club_feature_rows(club)

    ai_notice = build_ai_notice(
        metrics,  actual_feature_rows=actual_feature_rows,
    )


    final_comment = build_final_comment(
        metrics,
        total_score,
        total_status,
        ai_notice,
    )

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

        "aiNotice": ai_notice,

        "finalComment": final_comment,
        "monthlyTrend": build_monthly_trend(club),
    }
