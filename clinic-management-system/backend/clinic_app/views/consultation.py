from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Consultation
from ..serializers import ConsultationSerializer, ChatMessageSerializer


class ConsultationViewSet(viewsets.ModelViewSet):
    """
    GET  /api/consultations/{id}/         — Chi tiết phòng tư vấn
    POST /api/consultations/{id}/start/   — Bắt đầu phiên
    POST /api/consultations/{id}/end/     — Kết thúc phiên
    POST /api/consultations/{id}/message/ — Gửi tin nhắn chat
    """
    queryset = Consultation.objects.select_related("appointment").prefetch_related("messages")
    serializer_class = ConsultationSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """POST /api/consultations/{id}/start/ — Mở phòng tư vấn."""
        consultation = self.get_object()
        if consultation.status == "active":
            return Response({"detail": "Phiên đã đang diễn ra."}, status=400)

        # TODO: Tạo room trên Jitsi/Agora/WebRTC
        room_id = f"room_{consultation.id}_{int(timezone.now().timestamp())}"
        consultation.room_id = room_id
        consultation.room_url = f"https://meet.clinic.example.com/{room_id}"
        consultation.status = "active"
        consultation.started_at = timezone.now()
        consultation.save()
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        """POST /api/consultations/{id}/end/"""
        consultation = self.get_object()
        consultation.status = "ended"
        consultation.ended_at = timezone.now()
        consultation.save()
        return Response({
            "detail": "Phiên tư vấn đã kết thúc.",
            "duration_minutes": consultation.get_duration_minutes(),
        })

    @action(detail=True, methods=["post"])
    def message(self, request, pk=None):
        """POST /api/consultations/{id}/message/ — Gửi tin nhắn."""
        consultation = self.get_object()
        serializer = ChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(consultation=consultation, sender=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
