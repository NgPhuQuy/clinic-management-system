from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Notification
from ..serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/notifications/           — Thông báo của user hiện tại
    POST /api/notifications/read-all/  — Đánh dấu tất cả đã đọc
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")

    @action(detail=True, methods=["patch"])
    def read(self, request, pk=None):
        """PATCH /api/notifications/{id}/read/"""
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save()
        return Response({"detail": "Đã đánh dấu đã đọc."})

    @action(detail=False, methods=["post"])
    def read_all(self, request):
        """POST /api/notifications/read-all/"""
        self.get_queryset().filter(is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({"detail": "Đã đánh dấu tất cả đã đọc."})
