from django.urls import path

from .views import (
    ClubJoinRequestApproveView,
    ClubJoinRequestListView,
    ClubJoinRequestRejectView,
    ClubMembershipListView,
    ClubMembershipDetailUpdateView,
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
        "clubs/<int:club_id>/members/<int:membership_id>/",
        ClubMembershipDetailUpdateView.as_view(),
        name="club-member-detail-update",
    ),
]