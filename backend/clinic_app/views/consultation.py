"""
clinic_app/views/consultation.py

Mô hình "Google Meet" — Patient vào phòng chờ, Doctor admit.

Firestore collections:
  waiting_room/{consultation_id}   ← trạng thái phòng chờ (realtime)
  consultations/{consultation_id}  ← metadata chat (giữ nguyên như cũ)

Endpoints:
  GET  /consultations/{id}/        — Chi tiết + trạng thái
  POST /consultations/{id}/enter/  — Patient vào phòng chờ
  POST /consultations/{id}/start/  — Doctor admit → cả 2 vào Agora
  POST /consultations/{id}/end/    — Kết thúc (ai cũng bấm được)
  POST /consultations/{id}/sync/   — Force sync Firebase (admin/doctor)
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
    """Tạo Agora RTC Token hết hạn sau 1 giờ."""
    try:
        from agora_token_builder import RtcTokenBuilder, Role_Publisher
        return RtcTokenBuilder.buildTokenWithUid(
            settings.AGORA_APP_ID,
            settings.AGORA_APP_CERTIFICATE,
            channel_name,
            uid,
            Role_Publisher,
            int(time.time()) + 3600,
        )
    except ImportError:
        logger.error("agora-token-builder chưa được cài. Chạy: pip install agora-token-builder")
        return ""


# ─────────────────────────────────────────────
# Firebase helpers
# ─────────────────────────────────────────────

def _get_firestore_client():
    """Trả về Firestore client, None nếu chưa cấu hình."""
    try:
        import firebase_admin
        from firebase_admin import firestore, credentials

        if not firebase_admin._apps:
            cred = credentials.Certificate(str(settings.FIREBASE_CREDENTIALS_PATH))
            firebase_admin.initialize_app(cred)

        return firestore.client()
    except ImportError:
        logger.error("firebase-admin chưa được cài. Chạy: pip install firebase-admin")
        return None
    except Exception as exc:
        logger.exception("Không thể khởi tạo Firebase: %s", exc)
        return None


def _update_waiting_room(consultation: "Consultation", room_status: str) -> bool:
    """
    Ghi trạng thái phòng chờ lên Firestore.
    Client (cả patient lẫn doctor) lắng nghe collection này qua onSnapshot.

    Firestore path: waiting_room/{consultation_id}
      ├── consultationId: int
      ├── status:         "waiting" | "active" | "ended"
      ├── channelName:    "clinic_consult_42"
      ├── patientUid:     "clinic_{patient_user_id}"
      ├── doctorUid:      "clinic_{doctor_user_id}"
      └── updatedAt:      Timestamp
    """
    db = _get_firestore_client()
    if db is None:
        return False

    try:
        patient_uid = f"clinic_{consultation.appointment.patient.user_id}"
        doctor_uid  = f"clinic_{consultation.appointment.doctor.user_id}"

        db.collection("waiting_room").document(str(consultation.pk)).set(
            {
                "consultationId": consultation.pk,
                "status":         room_status,
                "channelName":    consultation.room_id,
                "patientUid":     patient_uid,
                "doctorUid":      doctor_uid,
                "updatedAt":      timezone.now(),
            },
            merge=True,
        )
        return True
    except Exception as exc:
        logger.exception("Lỗi khi update waiting_room #%s: %s", consultation.pk, exc)
        return False


def _sync_consultation_to_firebase(consultation: "Consultation") -> bool:
    """
    Sync metadata consultation lên Firestore (dùng cho chat).

    Firestore path: consultations/{consultation_id}
      ├── appointmentId, status, startedAt, endedAt
      ├── patientUid, doctorUid, participants
      └── updatedAt
    """
    db = _get_firestore_client()
    if db is None:
        return False

    try:
        patient_uid = f"clinic_{consultation.appointment.patient.user_id}"
        doctor_uid  = f"clinic_{consultation.appointment.doctor.user_id}"

        db.collection("consultations").document(str(consultation.pk)).set(
            {
                "appointmentId": consultation.appointment_id,
                "status":        consultation.status,
                "startedAt":     consultation.started_at,
                "endedAt":       consultation.ended_at,
                "patientUid":    patient_uid,
                "doctorUid":     doctor_uid,
                "participants":  [patient_uid, doctor_uid],
                "updatedAt":     timezone.now(),
            },
            merge=True,
        )
        return True
    except Exception as exc:
        logger.exception("Lỗi khi sync consultation #%s lên Firebase: %s", consultation.pk, exc)
        return False


# ─────────────────────────────────────────────
# ViewSet
# ─────────────────────────────────────────────

class ConsultationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Luồng "Google Meet":
      1. Appointment confirmed → signal tạo Consultation + set room_id.
      2. Patient bấm "Vào phòng khám"  → POST /enter/
             → status = waiting, Firestore waiting_room cập nhật.
             → Doctor nhận Notification.
      3. Doctor thấy bệnh nhân chờ     → POST /start/
             → status = active, Firestore waiting_room cập nhật.
             → Patient đang onSnapshot tự động nhận Agora token qua /enter/ lần 2.
             → Doctor nhận Agora token từ response.
      4. Ai cũng có thể bấm kết thúc   → POST /end/
             → status = ended, Firestore cập nhật, cả 2 leaveChannel().
    """

    queryset = Consultation.objects.select_related(
        "appointment__patient__user",
        "appointment__doctor__user",
    )
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticatedWithValidToken]

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        scopes = get_token_scopes(self.request)

        if "admin"   in scopes: return qs
        if "doctor"  in scopes: return qs.filter(appointment__doctor__user=user)
        if "patient" in scopes: return qs.filter(appointment__patient__user=user)
        return qs.none()

    # ── enter (Patient vào phòng chờ) ──────────

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[HasPatientScope],
        url_path="enter",
    )
    def enter(self, request, pk=None):
        """
        POST /consultations/{id}/enter/
        Bệnh nhân bấm "Vào phòng khám".

        Kết quả trả về tuỳ trạng thái:
          - waiting  → { status: "waiting" }          đang chờ bác sĩ
          - active   → { status: "active", agora_* }  bác sĩ đã mở → vào thẳng
          - ended    → 400
        """
        consultation = self.get_object()

        # Chỉ bệnh nhân của appointment này
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

        # Kiểm tra cửa sổ thời gian hợp lệ (15 phút trước → 30 phút sau giờ hẹn)
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

        _update_waiting_room(consultation, "waiting")

        # Thông báo cho bác sĩ
        Notification.objects.create(
            user=consultation.appointment.doctor.user,
            title="Bệnh nhân đang chờ khám",
            message=(
                f"{consultation.appointment.patient.full_name} "
                f"đã vào phòng chờ."
            ),
            type=Notification.Type.SYSTEM,
            related_object_id=consultation.pk,
        )

        return Response({
            "status":  "waiting",
            "message": "Đang chờ bác sĩ vào phòng...",
            "room_id": consultation.room_id,
        })

    # ── start (Doctor admit patient) ───────────

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[HasDoctorOrAdminScope],
        url_path="start",
    )
    def start(self, request, pk=None):
        """
        POST /consultations/{id}/start/
        Bác sĩ bấm "Bắt đầu khám" → admit patient.

        - Cập nhật status → active trong DB.
        - Cập nhật waiting_room trên Firestore → patient đang onSnapshot
          sẽ nhận status "active" và tự gọi /enter/ để lấy Agora token.
        - Trả Agora token cho bác sĩ ngay trong response này.
        """
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc, không thể mở lại."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation.status      = Consultation.Status.ACTIVE
        consultation.started_at  = timezone.now()
        consultation.save(update_fields=["status", "started_at"])

        # Cập nhật Firestore → patient onSnapshot nhận "active" → tự join
        _update_waiting_room(consultation, "active")
        _sync_consultation_to_firebase(consultation)

        # Trả token cho bác sĩ
        token = _generate_agora_token(consultation.room_id, request.user.pk)

        return Response({
            "status":       "active",
            "agora_app_id": settings.AGORA_APP_ID,
            "agora_token":  token,
            "channel_name": consultation.room_id,
            "uid":          request.user.pk,
        })

    # ── end (Ai cũng bấm được) ─────────────────

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticatedWithValidToken],
        url_path="end",
    )
    def end(self, request, pk=None):
        """
        POST /consultations/{id}/end/
        Kết thúc phiên khám — patient hoặc doctor đều có thể bấm.
        """
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc rồi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation.status   = Consultation.Status.ENDED
        consultation.ended_at = timezone.now()
        consultation.save(update_fields=["status", "ended_at"])

        _update_waiting_room(consultation, "ended")
        _sync_consultation_to_firebase(consultation)

        return Response({
            "detail":           "Phiên khám đã kết thúc.",
            "duration_minutes": consultation.get_duration_minutes(),
        })

    # ── messages (Chat) ───────────────────────

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticatedWithValidToken],
        url_path="messages",
    )
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

    # ── sync (Force sync Firebase) ─────────────

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[HasDoctorOrAdminScope],
        url_path="sync",
    )
    def sync(self, request, pk=None):
        """
        POST /consultations/{id}/sync/
        Force sync metadata lên Firebase khi bị mất đồng bộ.
        """
        consultation = self.get_object()

        synced_wr   = _update_waiting_room(consultation, consultation.status)
        synced_chat = _sync_consultation_to_firebase(consultation)

        if synced_wr and synced_chat:
            return Response({"detail": "Đồng bộ Firebase thành công."})

        return Response(
            {"detail": "Không thể đồng bộ Firebase. Kiểm tra cấu hình server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )