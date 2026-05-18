from django.urls import path
from .views import ClubMembershipListView

urlpatterns = [
    path(
        "clubs/<int:club_id>/members/",
        ClubMembershipListView.as_view(),
        name="club-member-list",
    ),
]