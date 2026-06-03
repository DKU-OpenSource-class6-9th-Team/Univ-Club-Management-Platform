from collections import defaultdict
from itertools import combinations

from django.utils import timezone

from events.models import Attendance, Event

from .models import ClubMembership, MemberRelationObservation


OFFICER_ROLES = {
    "president",
    "vice_president",
    "executive",
    "treasurer",
}

VALID_ATTENDANCE_STATUSES = [
    Attendance.STATUS_PRESENT,
    Attendance.STATUS_LATE,
]

ATTENDANCE_WEIGHT = {
    Attendance.STATUS_PRESENT: 1.0,
    Attendance.STATUS_LATE: 0.7,
}

EVENT_TYPE_WEIGHT = {
    Event.EVENT_TYPE_REGULAR: 1.0,
    Event.EVENT_TYPE_ACTIVITY: 0.9,
    Event.EVENT_TYPE_RECRUITMENT: 0.3,
    Event.EVENT_TYPE_INTERVIEW: 0.3,
    Event.EVENT_TYPE_PROJECT: 1.2,
    Event.EVENT_TYPE_ETC: 0.7,
}


def clamp(value, minimum=0, maximum=100):
    return max(minimum, min(maximum, value))


def round_number(value, digits=1):
    return round(float(value or 0), digits)


def has_model_field(model, field_name):
    try:
        model._meta.get_field(field_name)
        return True
    except Exception:
        return False


def get_member_display_name(membership):
    user = membership.user
    profile = getattr(user, "profile", None)

    if user.first_name:
        return user.first_name

    if profile and getattr(profile, "nickname", None):
        return profile.nickname

    return user.username


def get_member_brief(membership):
    return {
        "membership_id": membership.id,
        "user_id": membership.user_id,
        "name": get_member_display_name(membership),
        "username": membership.user.username,
        "role": membership.role,
        "role_display": membership.get_role_display(),
        "status": membership.status,
        "status_display": membership.get_status_display(),
    }


def get_recent_weight(event_start_at):
    if not event_start_at:
        return 0.5

    now = timezone.now()
    days = (now - event_start_at).days

    if days <= 30:
        return 1.0

    if days <= 90:
        return 0.8

    if days <= 180:
        return 0.5

    return 0.3


def is_recent_event(event_start_at, days=60):
    if not event_start_at:
        return False

    return (timezone.now() - event_start_at).days <= days


def get_event_type_weight(event_type):
    return EVENT_TYPE_WEIGHT.get(event_type, 0.7)


def get_connection_state(score):
    if score >= 80:
        return {
            "key": "stable",
            "label": "연결 안정",
        }

    if score >= 60:
        return {
            "key": "normal",
            "label": "보통",
        }

    if score >= 40:
        return {
            "key": "watch",
            "label": "관찰 필요",
        }

    return {
        "key": "risk",
        "label": "저연결 위험",
    }


def build_reason_messages(
    analyzed_event_count,
    attendance_count,
    total_strength,
    effective_connection_count,
    officer_touch_strength,
    max_relation_ratio,
    recent_relation_strength,
    tag_adjustment,
):
    reasons = []

    if analyzed_event_count == 0:
        return ["분석 가능한 완료 일정이 아직 없습니다."]

    if attendance_count == 0:
        return ["참석 또는 지각으로 기록된 활동이 아직 없습니다."]

    if total_strength <= 0:
        reasons.append("참석 기록은 있지만 함께 활동한 공동 참여 관계가 부족합니다.")

    if effective_connection_count < 2:
        reasons.append("유효 연결 인원이 낮아 조직 내 접점이 제한적입니다.")

    if officer_touch_strength <= 0:
        reasons.append("운영진과 함께 활동한 접점이 없습니다.")

    if max_relation_ratio >= 0.7:
        reasons.append("공동 참여 관계가 특정 회원에게 편중되어 있습니다.")

    if recent_relation_strength <= 0:
        reasons.append("최근 60일 내 공동 참여 관계가 부족합니다.")

    if tag_adjustment < 0:
        reasons.append("운영진 관찰 태그에서 주의가 필요한 관계로 기록되었습니다.")

    if not reasons:
        reasons.append("여러 회원과 비교적 고르게 연결되어 있습니다.")

    return reasons


def build_participation_network(club_id):
    members = list(
        ClubMembership.objects
        .filter(club_id=club_id)
        .exclude(status="withdrawn")
        .select_related("user", "user__profile", "club")
        .order_by("id")
    )

    members_by_id = {member.id: member for member in members}
    members_by_user_id = {member.user_id: member for member in members}
    user_ids = list(members_by_user_id.keys())

    event_filters = {
        "club_id": club_id,
        "status": Event.STATUS_COMPLETED,
    }

    if has_model_field(Event, "activity_score_enabled"):
        event_filters["activity_score_enabled"] = True

    if has_model_field(Event, "connection_score_enabled"):
        event_filters["connection_score_enabled"] = True

    events = list(
        Event.objects
        .filter(**event_filters)
        .order_by("-start_at", "-id")
    )

    events_by_id = {event.id: event for event in events}
    event_ids = list(events_by_id.keys())

    attendances = list(
        Attendance.objects
        .filter(
            event_id__in=event_ids,
            user_id__in=user_ids,
            status__in=VALID_ATTENDANCE_STATUSES,
        )
        .select_related("event", "user")
    )

    attendances_by_event = defaultdict(list)
    attendance_count_by_member = defaultdict(int)

    for attendance in attendances:
        if attendance.user_id not in members_by_user_id:
            continue

        attendances_by_event[attendance.event_id].append(attendance)
        member = members_by_user_id[attendance.user_id]
        attendance_count_by_member[member.id] += 1

    relation_edges = defaultdict(lambda: {
        "strength": 0.0,
        "event_count": 0,
        "recent_strength": 0.0,
        "event_titles": [],
    })

    for event_id, event_attendances in attendances_by_event.items():
        event = events_by_id.get(event_id)

        if not event:
            continue

        unique_attendances = {}
        for attendance in event_attendances:
            unique_attendances[attendance.user_id] = attendance

        event_attendances = list(unique_attendances.values())
        attendee_count = len(event_attendances)

        if attendee_count < 2:
            continue

        size_weight = 1 / (attendee_count - 1)
        recent_weight = get_recent_weight(event.start_at)
        event_type_weight = get_event_type_weight(event.event_type)
        base_event_weight = size_weight * recent_weight * event_type_weight
        is_recent = is_recent_event(event.start_at, days=60)

        for first_attendance, second_attendance in combinations(event_attendances, 2):
            first_member = members_by_user_id.get(first_attendance.user_id)
            second_member = members_by_user_id.get(second_attendance.user_id)

            if not first_member or not second_member:
                continue

            first_id, second_id = sorted([first_member.id, second_member.id])

            first_status_weight = ATTENDANCE_WEIGHT.get(first_attendance.status, 0)
            second_status_weight = ATTENDANCE_WEIGHT.get(second_attendance.status, 0)

            relation_increment = (
                first_status_weight
                * second_status_weight
                * base_event_weight
            )

            if relation_increment <= 0:
                continue

            pair_key = (first_id, second_id)
            relation_edges[pair_key]["strength"] += relation_increment
            relation_edges[pair_key]["event_count"] += 1

            if is_recent:
                relation_edges[pair_key]["recent_strength"] += relation_increment

            if len(relation_edges[pair_key]["event_titles"]) < 3:
                relation_edges[pair_key]["event_titles"].append(event.title)

    observations = list(
        MemberRelationObservation.objects
        .filter(club_id=club_id)
        .select_related(
            "from_member",
            "from_member__user",
            "from_member__user__profile",
            "to_member",
            "to_member__user",
            "to_member__user__profile",
            "created_by",
        )
    )

    observations_by_pair = defaultdict(list)
    tag_adjustment_by_member = defaultdict(float)

    for observation in observations:
        pair_key = tuple(sorted([observation.from_member_id, observation.to_member_id]))
        observations_by_pair[pair_key].append({
            "id": observation.id,
            "tag": observation.tag,
            "tag_display": observation.get_tag_display(),
            "score_value": observation.score_value,
            "memo": observation.memo,
            "created_by": observation.created_by.username if observation.created_by else None,
            "created_at": observation.created_at,
            "updated_at": observation.updated_at,
        })

        tag_adjustment_by_member[observation.from_member_id] += observation.score_value
        tag_adjustment_by_member[observation.to_member_id] += observation.score_value

    for member_id in list(tag_adjustment_by_member.keys()):
        tag_adjustment_by_member[member_id] = clamp(
            tag_adjustment_by_member[member_id],
            -10,
            10,
        )

    relations_by_member = defaultdict(list)
    relation_list = []

    for pair_key, edge in relation_edges.items():
        first_id, second_id = pair_key
        first_member = members_by_id.get(first_id)
        second_member = members_by_id.get(second_id)

        if not first_member or not second_member:
            continue

        relation_data = {
            "from_member": get_member_brief(first_member),
            "to_member": get_member_brief(second_member),
            "strength": round_number(edge["strength"]),
            "raw_strength": edge["strength"],
            "event_count": edge["event_count"],
            "recent_strength": round_number(edge["recent_strength"]),
            "raw_recent_strength": edge["recent_strength"],
            "event_titles": edge["event_titles"],
            "observations": observations_by_pair.get(pair_key, []),
        }

        relation_list.append(relation_data)

        relations_by_member[first_id].append((second_id, edge))
        relations_by_member[second_id].append((first_id, edge))

    analyzed_event_count = len(events)
    active_member_count = len(members)
    target_connection_count = max(1, min(5, active_member_count - 1))
    target_relation_strength = max(1.0, min(8.0, analyzed_event_count * 0.7))

    member_results = []

    for member in members:
        member_relations = relations_by_member.get(member.id, [])
        relation_strengths = [
            relation_edge["strength"]
            for _, relation_edge in member_relations
            if relation_edge["strength"] > 0
        ]

        total_strength = sum(relation_strengths)
        strength_square_sum = sum(strength ** 2 for strength in relation_strengths)

        if total_strength > 0 and strength_square_sum > 0:
            effective_connection_count = (total_strength ** 2) / strength_square_sum
        else:
            effective_connection_count = 0

        connected_member_count = len(relation_strengths)

        strongest_relation = None
        strongest_strength = 0

        officer_touch_strength = 0
        existing_member_touch_strength = 0
        recent_relation_strength = 0

        for partner_id, relation_edge in member_relations:
            partner = members_by_id.get(partner_id)

            if not partner:
                continue

            strength = relation_edge["strength"]

            if strength > strongest_strength:
                strongest_strength = strength
                strongest_relation = {
                    **get_member_brief(partner),
                    "strength": round_number(strength),
                }

            if partner.role in OFFICER_ROLES:
                officer_touch_strength += strength

            if partner.status != "new":
                existing_member_touch_strength += strength

            recent_relation_strength += relation_edge["recent_strength"]

        max_relation_ratio = (
            strongest_strength / total_strength
            if total_strength > 0
            else 0
        )

        width_score = min(
            effective_connection_count / target_connection_count * 35,
            35,
        )

        strength_score = min(
            total_strength / target_relation_strength * 25,
            25,
        )

        if member.status == "new":
            organization_touch_strength = (
                officer_touch_strength
                + existing_member_touch_strength * 0.7
            )
        else:
            organization_touch_strength = officer_touch_strength

        organization_score = min(
            organization_touch_strength / 2.0 * 20,
            20,
        )

        if total_strength <= 0:
            diversity_score = 0
        elif max_relation_ratio < 0.5:
            diversity_score = 10
        elif max_relation_ratio < 0.7:
            diversity_score = 6
        else:
            diversity_score = 3

        if recent_relation_strength >= 0.7:
            recent_score = 10
        elif recent_relation_strength > 0:
            recent_score = 6
        else:
            recent_score = 0

        auto_score = (
            width_score
            + strength_score
            + organization_score
            + diversity_score
            + recent_score
        )

        tag_adjustment = tag_adjustment_by_member.get(member.id, 0)
        final_score = clamp(auto_score + tag_adjustment, 0, 100)
        state = get_connection_state(final_score)

        reasons = build_reason_messages(
            analyzed_event_count=analyzed_event_count,
            attendance_count=attendance_count_by_member.get(member.id, 0),
            total_strength=total_strength,
            effective_connection_count=effective_connection_count,
            officer_touch_strength=officer_touch_strength,
            max_relation_ratio=max_relation_ratio,
            recent_relation_strength=recent_relation_strength,
            tag_adjustment=tag_adjustment,
        )

        member_results.append({
            **get_member_brief(member),
            "connection_score": round_number(final_score),
            "auto_score": round_number(auto_score),
            "tag_adjustment": round_number(tag_adjustment),
            "connection_state": state["key"],
            "connection_state_display": state["label"],
            "connected_member_count": connected_member_count,
            "effective_connection_count": round_number(effective_connection_count),
            "total_relation_strength": round_number(total_strength),
            "officer_touch_strength": round_number(officer_touch_strength),
            "existing_member_touch_strength": round_number(existing_member_touch_strength),
            "organization_touch_strength": round_number(organization_touch_strength),
            "max_relation_ratio": round_number(max_relation_ratio * 100),
            "recent_relation_strength": round_number(recent_relation_strength),
            "attendance_count": attendance_count_by_member.get(member.id, 0),
            "strongest_relation": strongest_relation,
            "score_parts": {
                "width_score": round_number(width_score),
                "strength_score": round_number(strength_score),
                "organization_score": round_number(organization_score),
                "diversity_score": round_number(diversity_score),
                "recent_score": round_number(recent_score),
            },
            "reasons": reasons,
        })

    member_results.sort(
        key=lambda item: (
            item["connection_score"],
            item["effective_connection_count"],
            item["total_relation_strength"],
        )
    )

    score_values = [member["connection_score"] for member in member_results]
    average_score = sum(score_values) / len(score_values) if score_values else 0

    summary = {
        "member_count": len(member_results),
        "analyzed_event_count": analyzed_event_count,
        "relation_count": len(relation_list),
        "average_score": round_number(average_score),
        "stable_count": len([m for m in member_results if m["connection_state"] == "stable"]),
        "normal_count": len([m for m in member_results if m["connection_state"] == "normal"]),
        "watch_count": len([m for m in member_results if m["connection_state"] == "watch"]),
        "risk_count": len([m for m in member_results if m["connection_state"] == "risk"]),
        "low_officer_touch_count": len([
            m for m in member_results
            if m["officer_touch_strength"] <= 0 and m["attendance_count"] > 0
        ]),
        "new_member_low_connection_count": len([
            m for m in member_results
            if m["status"] == "new" and m["connection_score"] < 60
        ]),
    }

    relation_list.sort(key=lambda item: item["raw_strength"], reverse=True)

    return {
        "summary": summary,
        "members": member_results,
        "relations": relation_list[:100],
    }


def build_member_network_detail(club_id, membership_id):
    network = build_participation_network(club_id)

    member = next(
        (
            member_data
            for member_data in network["members"]
            if member_data["membership_id"] == membership_id
        ),
        None,
    )

    if not member:
        return None

    related_relations = []

    for relation in network["relations"]:
        from_id = relation["from_member"]["membership_id"]
        to_id = relation["to_member"]["membership_id"]

        if membership_id in [from_id, to_id]:
            related_relations.append(relation)

    related_relations.sort(key=lambda item: item["raw_strength"], reverse=True)

    return {
        "summary": network["summary"],
        "member": member,
        "relations": related_relations,
    }