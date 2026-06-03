from django.urls import path

from .views import (
    ClubJoinRequestApproveView,
    ClubJoinRequestListView,
    ClubJoinRequestRejectView,
    ClubMembershipListView,
    ClubMembershipDetailUpdateView,
    ClubMemberActivityScoreSyncView,
    ClubParticipationNetworkView,
    ClubParticipationNetworkDetailView,
    MemberRelationObservationCreateView,
    MemberRelationObservationDetailView,
)

urlpatterns = [
    path(
        "clubs/<int:club_id>/members/",
        ClubMembershipListView.as_view(),
        name="club-member-list",
    ),

    path(
        "clubs/<int:club_id>/join-requests/",
        ClubJoinRequestListView.as_view(),
        name="club-join-request-list",
    ),

    path(
        "clubs/<int:club_id>/join-requests/<int:membership_id>/approve/",
        ClubJoinRequestApproveView.as_view(),
        name="club-join-request-approve",
    ),

    path(
        "clubs/<int:club_id>/join-requests/<int:membership_id>/reject/",
        ClubJoinRequestRejectView.as_view(),
        name="club-join-request-reject",
    ),

    path(
        "clubs/<int:club_id>/members/activity-scores/sync/",
        ClubMemberActivityScoreSyncView.as_view(),
        name="club-member-activity-score-sync",
    ),

        path(
        "clubs/<int:club_id>/members/network/",
        ClubParticipationNetworkView.as_view(),
        name="club-member-network",
    ),

    path(
        "clubs/<int:club_id>/members/network/observations/",
        MemberRelationObservationCreateView.as_view(),
        name="club-member-network-observation-create",
    ),

    path(
        "clubs/<int:club_id>/members/network/observations/<int:observation_id>/",
        MemberRelationObservationDetailView.as_view(),
        name="club-member-network-observation-detail",
    ),

    path(
        "clubs/<int:club_id>/members/network/<int:membership_id>/",
        ClubParticipationNetworkDetailView.as_view(),
        name="club-member-network-detail",
    ),

    path(
        "clubs/<int:club_id>/members/<int:membership_id>/",
        ClubMembershipDetailUpdateView.as_view(),
        name="club-member-detail-update",
    ),
]