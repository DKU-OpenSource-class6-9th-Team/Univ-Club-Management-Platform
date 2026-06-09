"""
동아리 건강도 지표 비교 Notice 생성 모듈.

주의:
- 건강도 점수 계산에는 영향을 주지 않는다.
- health_analysis.py에서 이미 계산된 상세 지표를 입력으로 받는다.
- 현재 Notice는 Isolation Forest가 아니라 합성 학습 데이터 대비 z-score 편차를 사용한다.
- 데이터가 없는 feature는 0으로 해석하지 않고 비교 대상에서 제외한다.
"""

import json
from pathlib import Path

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

HIGH_FEATURE_MESSAGES = {
    "activeMemberRate": "활동 참여 기반이 안정적인 강점 지표입니다.",
    "memberActivityScoreAverage": "회원 활동이 활발한 강점 지표입니다.",
    "scheduleSatisfactionScore": "활동과 일정 만족도가 좋은 강점 지표입니다.",
    "scheduleActivityRate": "일정 참여가 활발한 강점 지표입니다.",
    "actualAttendanceRate": "신청 이후 실제 참여가 잘 이어지는 강점 지표입니다.",
    "scheduleStabilityRate": "일정 운영이 안정적인 강점 지표입니다.",
    "paymentRate": "회비 납부 관리가 안정적인 강점 지표입니다.",
    "proofAttachmentRate": "증빙자료 관리가 잘 이루어지는 강점 지표입니다.",
    "feeSatisfactionScore": "회비 사용 만족도가 좋은 강점 지표입니다.",
    "responseRate": "만족도 조사 참여가 활발한 강점 지표입니다.",
}

LOW_FEATURE_MESSAGES = {
    "activeMemberRate": "활동 회원 참여를 점검해볼 필요가 있습니다.",
    "memberActivityScoreAverage": "회원 활동 흐름을 함께 살펴볼 필요가 있습니다.",
    "scheduleSatisfactionScore": "활동과 일정 만족도를 점검해볼 필요가 있습니다.",
    "scheduleActivityRate": "일정 참여를 높일 방법을 살펴볼 필요가 있습니다.",
    "actualAttendanceRate": "신청 후 실제 출석 흐름을 점검해볼 필요가 있습니다.",
    "scheduleStabilityRate": "일정 운영 안정성을 점검해볼 필요가 있습니다.",
    "paymentRate": "회비 납부 흐름을 점검해볼 필요가 있습니다.",
    "proofAttachmentRate": "증빙자료 첨부 관리를 점검해볼 필요가 있습니다.",
    "feeSatisfactionScore": "회비 사용 만족도를 살펴볼 필요가 있습니다.",
    "responseRate": "만족도 조사 참여를 높일 방법을 살펴볼 필요가 있습니다.",
}


MIN_USED_FEATURE_COUNT = 5

# 다른 동아리 대비 눈에 띄는 수준일 때만 Notice로 보여주기 위한 z-score 기준.
LOW_NOTICE_Z_SCORE = -2.0
HIGH_NOTICE_Z_SCORE = 2.0

# 표준편차가 지나치게 작아 z-score가 과도하게 커지는 것을 막기 위한 보정값.
MIN_STD = 5.0

# summary notice 1개 + 세부 feature notice 최대 3개를 권장한다.
MAX_DEVIATION_NOTICE_COUNT = 3


def generate_synthetic_training_data():
    """
    합성 학습 데이터 파일을 읽어 feature column만 숫자 데이터로 정리한다.

    profileName 같은 설명 필드는 학습에 사용하지 않는다. comment row나 필수 key가
    누락된 row가 들어와도 자동으로 제외한다.
    """
    data_path = (
        Path(__file__).resolve().parent.parent
        / "data"
        / "health_training_data.json"
    )

    with open(data_path, "r", encoding="utf-8") as file:
        rows = json.load(file)

    valid_rows = []

    for row in rows:
        if all(feature in row for feature in FEATURE_COLUMNS):
            valid_rows.append(row)

    training_data = pd.DataFrame(valid_rows)

    if training_data.empty:
        return pd.DataFrame(columns=FEATURE_COLUMNS)

    training_data = training_data[FEATURE_COLUMNS]
    training_data = training_data.apply(pd.to_numeric, errors="coerce")
    training_data = training_data.dropna()
    training_data = training_data.clip(lower=0, upper=100)

    return training_data


def generate_actual_training_data(actual_feature_rows=None):
    """
    현재 플랫폼에 등록된 실제 동아리들의 feature row를
    Notice 비교 기준 데이터로 변환

    - 실제 동아리 데이터는 일부 feature가 None일 수 있음"""

    if not actual_feature_rows:
        return pd.DataFrame(columns=FEATURE_COLUMNS)

    actual_data = pd.DataFrame(actual_feature_rows)

    if actual_data.empty:
        return pd.DataFrame(columns=FEATURE_COLUMNS)

    actual_data = actual_data.reindex(columns=FEATURE_COLUMNS)
    actual_data = actual_data.apply(pd.to_numeric, errors="coerce")
    actual_data = actual_data.clip(lower=0, upper=100)

    # 모든 feature가 비어 있는 row만 제외
    # 일부 feature가 비어 있는 row는 유지
    actual_data = actual_data.dropna(how="all")

    return actual_data


def build_current_club_feature_vector(metrics):
    """
    health_analysis.py에서 계산된 상세 지표를 비교용 feature로 변환한다.
    데이터가 준비되지 않은 항목은 None으로 기록하고 비교에서 제외한다.
    """
    member = metrics["member"]
    schedule = metrics["schedule"]
    finance = metrics["finance"]
    satisfaction = metrics["satisfaction"]

    feature_values = {}
    missing_features = []

    def set_feature(name, value, is_ready):
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


def fit_isolation_forest(training_data):
    """
    추후 최종 평가 코멘트 등에서 재사용할 수 있도록 남겨둔 Isolation Forest 학습 함수.
    현재 build_ai_notice()에서는 사용하지 않는다.
    """
    model = IsolationForest(
        n_estimators=100,
        contamination=0.10,
        random_state=42,
    )

    model.fit(training_data[FEATURE_COLUMNS])

    return model


def fill_missing_features_with_training_mean(feature_values, training_data):
    """
    추후 Isolation Forest 사용 시 None feature를 평균값으로 채우기 위한 helper.
    현재 build_ai_notice()에서는 사용하지 않는다.
    """
    filled_values = {}

    for feature in FEATURE_COLUMNS:
        value = feature_values.get(feature)

        if value is None:
            filled_values[feature] = float(training_data[feature].mean())
        else:
            filled_values[feature] = float(value)

    return filled_values


def calculate_feature_deviations(feature_values, missing_features, training_data):
    """
    현재 동아리의 feature가 합성 학습 데이터 평균에서 얼마나 벗어났는지 계산한다.
    """
    deviations = []

    for feature in FEATURE_COLUMNS:
        if feature in missing_features:
            continue

        value = feature_values.get(feature)

        if value is None:
            continue

        mean = float(training_data[feature].mean())
        std = float(training_data[feature].std())

        if std == 0:
            continue

        if std < MIN_STD:
            std = MIN_STD

        z_score = (float(value) - mean) / std

        if z_score <= LOW_NOTICE_Z_SCORE:
            direction = "low"
        elif z_score >= HIGH_NOTICE_Z_SCORE:
            direction = "high"
        else:
            direction = "normal"

        deviations.append({
            "feature": feature,
            "label": FEATURE_LABELS[feature],
            "value": round(float(value), 1),
            "mean": round(mean, 1),
            "zScore": round(z_score, 2),
            "direction": direction,
        })

    return deviations


def calculate_deviation_summary(deviations):
    if not deviations:
        return {
            "deviationScore": 0,
            "averageAbsZScore": 0,
            "maxAbsZScore": 0,
            "highFeatureCount": 0,
            "lowFeatureCount": 0,
            "noticeFeatureCount": 0,
        }

    abs_scores = [abs(item["zScore"]) for item in deviations]
    high_features = [
        item for item in deviations
        if item["direction"] == "high"
    ]
    low_features = [
        item for item in deviations
        if item["direction"] == "low"
    ]

    average_abs_z = sum(abs_scores) / len(abs_scores)
    max_abs_z = max(abs_scores)
    deviation_score = min(round((average_abs_z / 2.5) * 100, 1), 100)

    return {
        "deviationScore": deviation_score,
        "averageAbsZScore": round(average_abs_z, 2),
        "maxAbsZScore": round(max_abs_z, 2),
        "highFeatureCount": len(high_features),
        "lowFeatureCount": len(low_features),
        "noticeFeatureCount": len(high_features) + len(low_features),
    }


def format_score(value):
    if float(value).is_integer():
        return str(int(value))

    return str(value)


def subject_particle(text):
    last_char = text[-1]

    if "가" <= last_char <= "힣":
        has_final_consonant = (ord(last_char) - ord("가")) % 28 != 0
        return "이" if has_final_consonant else "가"

    return "이"


def build_ai_notice(metrics, actual_feature_rows=None):
    """
    건강도 점수 계산과 분리된 참고 Notice를 생성한다.
    """
    synthetic_data = generate_synthetic_training_data()
    actual_data = generate_actual_training_data(actual_feature_rows)

    training_data = pd.concat(
        [synthetic_data, actual_data],
        ignore_index=True,
    )

    feature_values, missing_features = build_current_club_feature_vector(metrics)
    used_feature_count = len(FEATURE_COLUMNS) - len(missing_features)

    base_result = {
        "trainingSampleCount": len(training_data),
        "syntheticSampleCount": len(synthetic_data),
        "actualClubSampleCount": len(actual_data),
        "usedFeatureCount": used_feature_count,
    }

    if used_feature_count < MIN_USED_FEATURE_COUNT or training_data.empty:
        return {
            "enabled": True,
            "mode": "HYBRID_SYNTHETIC_AND_ACTUAL_CROSS_CLUB_FEATURE_DEVIATION",
            "model": "ZScoreDeviationAnalysis",
            "description": (
                "합성 학습 데이터와 현재 플랫폼의 실제 다른 동아리 상세 지표를 함께 비교하는 "
                "상대 지표 분석입니다."
            ),
            "modelResult": {
                **base_result,
                "deviationScore": 0,
                "averageAbsZScore": 0,
                "maxAbsZScore": 0,
                "highFeatureCount": 0,
                "lowFeatureCount": 0,
                "noticeFeatureCount": 0,
            },
            "items": [
                {
                    "severity": "info",
                    "title": "지표 비교를 위한 데이터가 부족합니다",
                    "description": (
                        "현재 동아리의 건강도 상세 지표 중 사용 가능한 항목이 부족하여 "
                        "다른 동아리와의 상대 비교를 수행하지 못했습니다."
                    ),
                }
            ],
            "deviations": [],
        }

    deviations = calculate_feature_deviations(
        feature_values,
        missing_features,
        training_data,
    )
    deviation_summary = calculate_deviation_summary(deviations)

    standout_deviations = [
        item
        for item in deviations
        if item["direction"] in ("high", "low")
    ]
    standout_deviations = sorted(
        standout_deviations,
        key=lambda item: abs(item["zScore"]),
        reverse=True,
    )

    high_features = [
        item for item in standout_deviations
        if item["direction"] == "high"
    ]
    low_features = [
        item for item in standout_deviations
        if item["direction"] == "low"
    ]

    items = []

    if not standout_deviations:
        items.append({
            "severity": "info",
            "title": "눈에 띄는 지표 차이가 없습니다",
            "description": "주요 건강도 지표가 비교 기준 범위 안에 있습니다.",
        })
    elif high_features and low_features:
        items.append({
            "severity": "info",
            "title": "일부 지표 차이가 확인됩니다",
            "description": "몇몇 상세 지표가 다른 동아리 평균과 차이를 보입니다.",
        })
    elif high_features:
        items.append({
            "severity": "info",
            "title": "우수한 상세 지표가 확인됩니다",
            "description": "몇몇 상세 지표가 비교 평균보다 높게 나타납니다.",
        })
    else:
        items.append({
            "severity": "info",
            "title": "낮은 상세 지표가 확인됩니다",
            "description": "몇몇 상세 지표가 비교 평균보다 낮게 나타납니다.",
        })

    for deviation in standout_deviations[:MAX_DEVIATION_NOTICE_COUNT]:
        value_text = format_score(deviation["value"])
        mean_text = format_score(deviation["mean"])

        if deviation["direction"] == "low":
            severity = "warning"
            title = (
                f"{deviation['label']}{subject_particle(deviation['label'])} "
                "낮은 편입니다"
            )
            detail_text = LOW_FEATURE_MESSAGES.get(
                deviation["feature"],
                "다른 지표와 함께 점검해볼 필요가 있습니다.",
            )
        else:
            severity = "excellent"
            title = (
                f"{deviation['label']}{subject_particle(deviation['label'])} "
                "높은 편입니다"
            )
            detail_text = HIGH_FEATURE_MESSAGES.get(
                deviation["feature"],
                "운영 강점으로 볼 수 있는 항목입니다.",
            )

        items.append({
            "severity": severity,
            "title": title,
            "description": (
                f"현재 {value_text}점 · 비교 평균 {mean_text}점\n"
                f"{detail_text}"
            ),
        })

    return {
        "enabled": True,
        "mode": "HYBRID_SYNTHETIC_AND_ACTUAL_CROSS_CLUB_FEATURE_DEVIATION",
        "model": "ZScoreDeviationAnalysis",
        "description": (
            "합성 학습 데이터와 현재 플랫폼의 실제 다른 동아리 상세 지표를 함께 비교하는 상대 지표 분석입니다."
        ),
        "modelResult": {
            **base_result,
            **deviation_summary,
        },
        "items": items,
        "deviations": deviations,
    }
