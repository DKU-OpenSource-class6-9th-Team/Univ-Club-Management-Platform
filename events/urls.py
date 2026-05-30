from django.urls import path

from .views import (
    EventDetailView,
    EventListCreateView,
    MyEventRoleView,
)


urlpatterns = [
    path(
        "clubs/<int:club_id>/events/",
        EventListCreateView.as_view(),
        name="event-list-create",
    ),
    path(
        "clubs/<int:club_id>/events/my-role/",
        MyEventRoleView.as_view(),
        name="event-my-role",
    ),
    path(
        "clubs/<int:club_id>/events/<int:event_id>/",
        EventDetailView.as_view(),
        name="event-detail",
    ),
]