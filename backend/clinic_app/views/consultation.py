"""
clinic_app/views/consultation.py

Mô hình "Google Meet" — Patient vào phòng chờ, Doctor admit.
Trạng thái phòng chờ đồng bộ qua DB, frontend polling mỗi 4s.

Endpoints:
  GET  /consultations/{id}/        — Chi tiết + tin nhắn
  POST /consultations/{id}/enter/  — Patient vào phòng chờ
  POST /consultations/{id}/start/  — Doctor admit → cả 2 vào Agora
  POST /consultations/{id}/end/    — Kết thúc (ai cũng bấm được)
  POST /consultations/{id}/messages/ — Gửi tin nhắn
"""

import logging
import time
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Consultation, Notification, ChatMessage
from ..permissions import (
    IsAuthenticatedWithValidToken,
    HasDoctorOrAdminScope,
    HasPatientScope,
)
from ..serializers import ConsultationSerializer, ChatMessageSerializer
from ..utils import get_token_scopes

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Agora helper
# ─────────────────────────────────────────────

def _generate_agora_token(channel_name: str, uid: int) -> str:
    try:
        from agora_token_builder import RtcTokenBuilder, Role_Publisher
        return RtcTokenBuilder.buildTokenWithUid(
            settings.AGORA_APP_ID,
            settings.AGORA_APP_CERTIFICATE,
            channel_name,
            uid,
            Role_Publisher,
            int(time.time()) + settings.AGORA_TOKEN_EXPIRY,
        )
    except ImportError:
        logger.error("agora-token-builder chưa được cài. Chạy: pip install agora-token-builder")
        return ""


def _generate_agora_rtm_token(user_id: str) -> str:
    """Generate Agora RTM token for real-time messaging."""
    try:
        from agora_token_builder import RtmTokenBuilder
        return RtmTokenBuilder.buildToken(
            settings.AGORA_APP_ID,
            settings.AGORA_APP_CERTIFICATE,
            user_id,
            int(time.time()) + settings.AGORA_TOKEN_EXPIRY,
        )
    except Exception as e:
        logger.warning(f"RTM token generation failed: {e}")
        return ""


# ─────────────────────────────────────────────
# ViewSet
# ─────────────────────────────────────────────

class ConsultationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Luồng "Google Meet":
      1. Appointment confirmed → signal tạo Consultation + set room_id.
      2. Patient bấm "Vào phòng khám"  → POST /enter/
             → status = waiting, thông báo cho bác sĩ.
      3. Doctor thấy bệnh nhân chờ     → POST /start/
             → status = active, trả Agora token cho bác sĩ.
             → Frontend patient polling 4s → thấy active → gọi /enter/ → lấy token.
      4. Ai cũng có thể bấm kết thúc   → POST /end/
    """

    queryset = Consultation.objects.select_related(
        "appointment__patient__user",
        "appointment__doctor__user",
    )
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticatedWithValidToken]

    def get_queryset(self):
        user   = self.request.user
        qs     = super().get_queryset()
        scopes = get_token_scopes(self.request)

        if "admin"   in scopes: return qs
        if "doctor"  in scopes: return qs.filter(appointment__doctor__user=user)
        if "patient" in scopes: return qs.filter(appointment__patient__user=user)
        return qs.none()

    # ── enter (Patient vào phòng chờ) ──────────

    @action(detail=True, methods=["post"], permission_classes=[HasPatientScope], url_path="enter")
    def enter(self, request, pk=None):
        """
        POST /consultations/{id}/enter/
        Bệnh nhân bấm "Vào phòng khám".

        Trả về tuỳ trạng thái:
          - waiting → { status: "waiting" }          đang chờ bác sĩ
          - active  → { status: "active", agora_* }  bác sĩ đã mở → vào thẳng
          - ended   → 400
        """
        consultation = self.get_object()

        if consultation.appointment.patient.user != request.user:
            return Response(
                {"detail": "Bạn không phải bệnh nhân của lịch hẹn này."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment_time = consultation.appointment.appointment_date
        now          = timezone.now()
        window_open  = appointment_time - timedelta(minutes=settings.CONSULTATION_WINDOW_BEFORE_MINUTES)
        window_close = appointment_time + timedelta(minutes=settings.CONSULTATION_WINDOW_AFTER_MINUTES)

        if not (window_open <= now <= window_close):
            return Response(
                {
                    "detail": (
                        f"Phòng khám chỉ mở trong khoảng "
                        f"{window_open.strftime('%H:%M')} – "
                        f"{window_close.strftime('%H:%M')}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Bác sĩ đã mở phòng rồi → vào thẳng, trả Agora token luôn
        if consultation.status == Consultation.Status.ACTIVE:
            token = _generate_agora_token(consultation.room_id, request.user.pk)
            return Response({
                "status":       "active",
                "agora_app_id": settings.AGORA_APP_ID,
                "agora_token":  token,
                "channel_name": consultation.room_id,
                "uid":          request.user.pk,
            })

        # Chưa có bác sĩ → vào phòng chờ
        consultation.status = Consultation.Status.WAITING
        consultation.save(update_fields=["status"])

        Notification.objects.create(
            user=consultation.appointment.doctor.user,
            title="Bệnh nhân đang chờ khám",
            message=f"{consultation.appointment.patient.full_name} đã vào phòng chờ.",
            type=Notification.Type.SYSTEM,
            related_object_id=consultation.pk,
        )

        return Response({
            "status":  "waiting",
            "message": "Đang chờ bác sĩ vào phòng...",
            "room_id": consultation.room_id,
        })

    # ── start (Doctor admit patient) ───────────

    @action(detail=True, methods=["post"], permission_classes=[HasDoctorOrAdminScope], url_path="start")
    def start(self, request, pk=None):
        """
        POST /consultations/{id}/start/
        Bác sĩ bấm "Bắt đầu khám" → cập nhật DB status = active.
        Frontend patient đang poll sẽ nhận được status active và tự gọi /enter/.
        """
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc, không thể mở lại."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation.status     = Consultation.Status.ACTIVE
        consultation.started_at = timezone.now()
        consultation.save(update_fields=["status", "started_at"])

        token = _generate_agora_token(consultation.room_id, request.user.pk)

        return Response({
            "status":       "active",
            "agora_app_id": settings.AGORA_APP_ID,
            "agora_token":  token,
            "channel_name": consultation.room_id,
            "uid":          request.user.pk,
        })

    # ── end (Ai cũng bấm được) ─────────────────

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedWithValidToken], url_path="end")
    def end(self, request, pk=None):
        """POST /consultations/{id}/end/ — Kết thúc phiên khám."""
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc rồi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation.status   = Consultation.Status.ENDED
        consultation.ended_at = timezone.now()
        consultation.save(update_fields=["status", "ended_at"])

        return Response({
            "detail":           "Phiên khám đã kết thúc.",
            "duration_minutes": consultation.get_duration_minutes(),
        })

    # ── rtm-token (Agora RTM real-time chat) ──

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticatedWithValidToken], url_path="rtm-token")
    def rtm_token(self, request, pk=None):
        """
        GET /consultations/{id}/rtm-token/
        Lấy Agora RTM token để kết nối real-time chat.
        """
        consultation = self.get_object()
        rtm_token = _generate_agora_rtm_token(str(request.user.pk))
        return Response({
            "rtm_token":    rtm_token,
            "agora_app_id": settings.AGORA_APP_ID,
            "channel_name": consultation.room_id,
            "uid":          str(request.user.pk),
        })

    # ── messages (Chat) ───────────────────────

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedWithValidToken], url_path="messages")
    def messages(self, request, pk=None):
        """POST /consultations/{id}/messages/ — Gửi tin nhắn trong phòng khám."""
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc, không thể gửi tin nhắn."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        text = request.data.get("message", "").strip()
        if not text:
            return Response({"detail": "Tin nhắn không được để trống."}, status=status.HTTP_400_BAD_REQUEST)

        msg = ChatMessage.objects.create(
            consultation=consultation,
            sender=request.user,
            message=text,
        )
        return Response(ChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)
