from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Notification
from ..serializers import NotificationSerializer
from ..permissions import IsAuthenticatedWithValidToken


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticatedWithValidToken]

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    @action(detail=True, methods=["patch"])
    def read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save()
        return Response({"detail": "Đã đánh dấu đã đọc."})

    @action(detail=False, methods=["patch"])
    def read_all(self, request):
        now = timezone.now()
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True, read_at=now
        )
        return Response({"detail": f"Đã đánh dấu {updated} thông báo đã đọc."})
