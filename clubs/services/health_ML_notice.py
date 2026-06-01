"""
건강도 분석 AI Notice

역할:
- 기존 건강도 점수를 계산하거나 변경하지 않는다.
- health_analysis.py에서 이미 계산된 상세 지표를 입력으로 받는다.
- Isolation Forest는 전체 운영 패턴의 이상 여부를 판단한다.
- z-score는 어떤 feature가 평균보다 낮거나 높은지 설명하는 데 사용한다.

주의:
- AI Notice는 참고용이다.
- 데이터가 없는 feature를 0점으로 넣지 않는다.
- 데이터가 없는 feature는 학습 데이터 평균값으로 대체하되,
  세부 Notice 원인 설명에서는 제외한다.
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


FEATURE_COLUMNS = [
    "activeMemberRate",
    "memberActivityScoreAverage",
    "scheduleSatisfactionScore",
    "scheduleActivityRate",
    "actualAttendanceRate",
    "scheduleStabilityRate",
    "paymentRate",
    "proofAttachmentRate",
    "feeSatisfactionScore",
    "responseRate",
]


FEATURE_LABELS = {
    "activeMemberRate": "활동 회원 비율",
    "memberActivityScoreAverage": "회원 활동 점수 평균",
    "scheduleSatisfactionScore": "활동/일정 만족도",
    "scheduleActivityRate": "일정 활동 인원 비율",
    "actualAttendanceRate": "신청자 대비 실제 출석률",
    "scheduleStabilityRate": "일정 운영 안정성",
    "paymentRate": "회비 납부율",
    "proofAttachmentRate": "증빙자료 첨부율",
    "feeSatisfactionScore": "회비 사용 만족도",
    "responseRate": "만족도 응답률",
}

MIN_USED_FEATURE_COUNT = 5


#합성 데이터를 불러오는 함수
def generate_synthetic_training_data():
    """
    현재 단계에서는 실제 여러 동아리의 건강도 데이터가 충분하지 않기 때문에
    JSON 파일에 정의한 가상의 동아리 row를 학습 데이터로 사용

    최종적으로는 이 함수 대신 DB 데이터를 불러오거나,
    합성데이터 + db데이터 구조로 확장
    """
    data_path = (
        Path(__file__).resolve().parent.parent
        / "data"
        / "health_training_data.json"
    )

    with open(data_path, "r", encoding="utf-8") as file:
        rows = json.load(file)

    training_data = pd.DataFrame(rows)

    # profileName 같은 설명 필드는 모델 학습에서 제외하고 숫자 feature만 사용한다.
    training_data = training_data[FEATURE_COLUMNS]

    # 모든 feature는 0~100 범위여야 한다.
    training_data = training_data.clip(lower=0, upper=100)

    return training_data


#health_analysis.py에서 계산된 값들을 AI 모델 입력 feature(입력값)로 변환하는 함수
def build_current_club_feature_vector(metrics):
    """
    - 기존 점수를 다시 계산하지 않는다.
    - 이미 계산된 상세 데이터를 가져온다.
    - 데이터가 없는 항목은 0이 아니라 None으로 기록한다.
    """

    member = metrics["member"]
    schedule = metrics["schedule"]
    finance = metrics["finance"]
    satisfaction = metrics["satisfaction"]

    feature_values = {}
    missing_features = []

    #feature 값 저장하는 함수
    def set_feature(name, value, is_ready):
        """
        is_ready=False이면 value가 0이어도 실제 0점이 아니라
        '데이터 없음'일 수 있으므로 None으로 처리한다.
        """
        if not is_ready:
            feature_values[name] = None
            missing_features.append(name)
            return

        feature_values[name] = value

    set_feature(
        "activeMemberRate",
        member.get("activeRate"),
        member.get("dataReady"),
    )

    set_feature(
        "memberActivityScoreAverage",
        member.get("averageActivityScore"),
        member.get("dataReady"),
    )

    set_feature(
        "scheduleSatisfactionScore",
        schedule.get("scheduleSatisfactionScore"),
        schedule.get("scheduleSatisfactionReady"),
    )

    set_feature(
        "scheduleActivityRate",
        schedule.get("scheduleActivityRate"),
        schedule.get("dataReady"),
    )

    set_feature(
        "actualAttendanceRate",
        schedule.get("actualAttendanceRate"),
        schedule.get("dataReady"),
    )

    set_feature(
        "scheduleStabilityRate",
        schedule.get("scheduleStabilityRate"),
        schedule.get("dataReady"),
    )

    set_feature(
        "paymentRate",
        finance.get("paymentRate"),
        finance.get("dataReady"),
    )

    set_feature(
        "proofAttachmentRate",
        finance.get("receiptRate"),
        finance.get("dataReady"),
    )

    set_feature(
        "feeSatisfactionScore",
        finance.get("feeSatisfactionScore"),
        finance.get("feeSatisfactionReady"),
    )

    set_feature(
        "responseRate",
        satisfaction.get("responseRate"),
        satisfaction.get("dataReady"),
    )

    return feature_values, missing_features


#Isolation Forest 모델을 학습
def fit_isolation_forest(training_data):
    """
    Isolation Forest의 역할:
    - 각 feature 하나만 보는 것 X,
      여러 운영 지표의 조합이 일반적인 패턴과 다른지 판단

    contamination=0.10:
    - 학습 데이터 중 약 10% 정도는 이상 패턴일 수 있다고 가정
    - 초기 기준이므로 추후 실제 데이터가 쌓이면 조정 가능
    """
    model = IsolationForest(
        n_estimators=100,
        contamination=0.10,
        random_state=42,
    )

    model.fit(training_data[FEATURE_COLUMNS])

    return model


#데이터가 없는 feature는 학습 데이터 평균값으로 대체하는 함수
#데이터 없는 feature(입력값)가 AI 판단을 왜곡하지 않도록 중립값으로 처리
def fill_missing_features_with_training_mean(feature_values, training_data):
    """
    이유:
    - Isolation Forest는 None 값을 입력받을 수 없음
    - 하지만 None을 0으로 바꾸면 '데이터 없음'이 '매우 나쁨'으로 mispredict
    - 따라서 평균값으로 대체해서 stale한 모델 판단 최대한 방지
    """
    filled_values = {}

    for feature in FEATURE_COLUMNS:
        value = feature_values.get(feature)

        if value is None:
            filled_values[feature] = float(training_data[feature].mean())
        else:
            filled_values[feature] = float(value)

    return filled_values


#z-score계산 함수
#z-score: 동아리의 각 feature가 합성 학습 데이터 평균에서 얼마나 벗어났는지 계산
def calculate_feature_deviations(feature_values, missing_features, training_data):
    """
    Isolation Forest:
    - 전체 조합 이상 여부 판단

    z-score:
    - 어떤 세부 항목이 평균보다 낮거나 높은지 설명
    """
    deviations = []

    for feature in FEATURE_COLUMNS:
        # 데이터가 없는 feature는 Notice 원인 설명에서 제외한다.
        if feature in missing_features:
            continue

        value = feature_values.get(feature)

        if value is None:
            continue

        mean = float(training_data[feature].mean())
        std = float(training_data[feature].std())

        if std == 0:
            continue

        z_score = (float(value) - mean) / std

        deviations.append({
            "feature": feature,
            "label": FEATURE_LABELS[feature],
            "value": round(float(value), 1),
            "mean": round(mean, 1),
            "zScore": round(z_score, 2),
        })

    return deviations


#최종 AI Notice 응답을 생성
def build_ai_notice(metrics):
    """
    - 건강도 점수를 계산, 변경하지 않음
    - 이미 계산된 상세 지표를 바탕으로 참고 Notice만 만듬
    """
    training_data = generate_synthetic_training_data()

    feature_values, missing_features = build_current_club_feature_vector(metrics)

    used_feature_count = len(FEATURE_COLUMNS) - len(missing_features)

    if used_feature_count < MIN_USED_FEATURE_COUNT:
        return {
            "enabled": True,
            "mode": "SYNTHETIC_CROSS_CLUB_ISOLATION_FOREST",
            "model": "IsolationForest",
            "description": "AI Notice는 건강도 점수에 영향을 주지 않는 참고 분석입니다.",
            "modelResult": {
                "isAnomaly": False,
                "anomalyScore": None,
                "trainingSampleCount": len(training_data),
                "usedFeatureCount": used_feature_count,
            },
            "items": [
                {
                    "severity": "info",
                    "title": "AI 분석을 위한 데이터가 부족합니다",
                    "description": (
                        "현재 동아리의 건강도 상세 지표 중 사용 가능한 항목이 부족하여 "
                        "이상 탐지를 수행하지 않았습니다."
                    ),
                }
            ],
        }

    filled_values = fill_missing_features_with_training_mean(
        feature_values,
        training_data,
    )

    current_df = pd.DataFrame([filled_values], columns=FEATURE_COLUMNS)

    model = fit_isolation_forest(training_data)

    prediction = model.predict(current_df)[0]
    anomaly_score = model.decision_function(current_df)[0]

    is_anomaly = prediction == -1

    deviations = calculate_feature_deviations(
        feature_values,
        missing_features,
        training_data,
    )

    items = []

    if is_anomaly:
        items.append({
            "severity": "warning",
            "title": "일반적인 동아리 운영 패턴과 다른 조합이 감지되었습니다",
            "description": (
                "현재 동아리의 건강도 상세 지표 조합이 합성 학습 데이터의 일반적인 패턴과 "
                "다소 다르게 나타났습니다. 아래 세부 항목을 참고해 운영 상태를 확인해 주세요."
            ),
        })
    else:
        items.append({
            "severity": "info",
            "title": "전반적인 운영 패턴은 일반 범위에 가깝습니다",
            "description": (
                "현재 동아리의 상세 지표 조합은 합성 학습 데이터 기준으로 "
                "큰 이상 패턴으로 판단되지 않았습니다."
            ),
        })

    # 평균보다 크게 낮은 feature는 warning 또는 danger로 표시한다.
    low_deviations = sorted(deviations, key=lambda item: item["zScore"])

    for deviation in low_deviations[:3]:
        if deviation["zScore"] <= -2.0:
            severity = "danger"
        elif deviation["zScore"] <= -1.2:
            severity = "warning"
        else:
            continue

        items.append({
            "severity": severity,
            "title": f"{deviation['label']}이 평균보다 낮습니다",
            "description": (
                f"현재 값은 {deviation['value']}점이며, "
                f"합성 학습 데이터 평균 {deviation['mean']}점보다 낮습니다. "
                f"해당 항목은 운영 개선이 필요한 후보로 볼 수 있습니다."
            ),
        })

    # 평균보다 크게 높은 feature는 excellent로 표시한다.
    high_deviations = sorted(
        deviations,
        key=lambda item: item["zScore"],
        reverse=True,
    )

    for deviation in high_deviations[:2]:
        if deviation["zScore"] < 1.5:
            continue

        items.append({
            "severity": "excellent",
            "title": f"{deviation['label']}이 평균보다 우수합니다",
            "description": (
                f"현재 값은 {deviation['value']}점이며, "
                f"합성 학습 데이터 평균 {deviation['mean']}점보다 높습니다. "
                f"동아리 운영의 강점으로 볼 수 있습니다."
            ),
        })

    return {
        "enabled": True,
        "mode": "SYNTHETIC_CROSS_CLUB_ISOLATION_FOREST",
        "model": "IsolationForest",
        "description": (
            "합성 동아리 건강도 데이터를 기준으로 현재 동아리의 상세 지표 조합을 비교합니다. "
            "AI Notice는 참고용이며 건강도 점수에는 영향을 주지 않습니다."
        ),
        "modelResult": {
            "isAnomaly": is_anomaly,
            "anomalyScore": round(float(anomaly_score), 4),
            "trainingSampleCount": len(training_data),
            "usedFeatureCount": used_feature_count,
        },
        "items": items,
    }