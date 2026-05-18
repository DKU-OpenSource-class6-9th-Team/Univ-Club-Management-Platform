from django.db.models import Q
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import ClubMembership
from .serializers import ClubMembershipListSerializer


class ClubMembershipListView(ListAPIView):
    serializer_class = ClubMembershipListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        club_id = self.kwargs["club_id"]

        queryset = (
            ClubMembership.objects
            .filter(club_id=club_id)
            .select_related("user", "club")
            .order_by("-joined_at", "id")
        )

        search = self.request.query_params.get("search", "").strip()
        role = self.request.query_params.get("role", "").strip()
        status = self.request.query_params.get("status", "").strip()
        min_score = self.request.query_params.get("min_score", "").strip()
        max_score = self.request.query_params.get("max_score", "").strip()

        if search:
            queryset = queryset.filter(
                Q(user__username__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__profile__nickname__icontains=search)
                | Q(user__profile__student_id__icontains=search)
                | Q(user__profile__department__icontains=search)
            )

        if role:
            queryset = queryset.filter(role=role)

        if status:
            queryset = queryset.filter(status=status)

        if min_score:
            try:
                queryset = queryset.filter(activity_score__gte=int(min_score))
            except ValueError:
                pass

        if max_score:
            try:
                queryset = queryset.filter(activity_score__lte=int(max_score))
            except ValueError:
                pass

        return queryset