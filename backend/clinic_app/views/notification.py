"""
clinic_app/views/notification.py

BUG ĐÃ SỬA:
  - permission_classes = [IsAuthenticated] (Django session) →
    IsAuthenticatedWithValidToken (OAuth2-aware)
"""

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Notification
from ..serializers import NotificationSerializer
from ..permissions import IsAuthenticatedWithValidToken


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/notifications/           — Thông báo của user hiện tại [any auth]
    PATCH /api/notifications/{id}/read/ — Đánh dấu đã đọc            [any auth]
    PATCH /api/notifications/read-all/  — Đánh dấu tất cả đã đọc    [any auth]
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticatedWithValidToken]  # BUG FIX

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    @action(detail=True, methods=["patch"])
    def read(self, request, pk=None):
        """PATCH /api/notifications/{id}/read/ — Đánh dấu 1 thông báo đã đọc."""
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save()
        return Response({"detail": "Đã đánh dấu đã đọc."})

    @action(detail=False, methods=["patch"])
    def read_all(self, request):
        """PATCH /api/notifications/read-all/ — Đánh dấu tất cả đã đọc."""
        now = timezone.now()
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True, read_at=now
        )
        return Response({"detail": f"Đã đánh dấu {updated} thông báo đã đọc."})