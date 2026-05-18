from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import ClubMembership
from .serializers import ClubMembershipListSerializer


class ClubMembershipListView(ListAPIView):
    serializer_class = ClubMembershipListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        club_id = self.kwargs["club_id"]

        return (
            ClubMembership.objects
            .filter(club_id=club_id)
            .select_related("user", "club")
            .order_by("-joined_at", "id")
        )