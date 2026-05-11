"""
clinic_app/views/consultation.py

Firebase Chat Integration:
  - DB chỉ lưu metadata (status, started_at, ended_at).
  - Tin nhắn thực tế lưu trên Firestore:
      /consultations/{consultation_id}/messages/{auto_id}
  - Client dùng Firebase SDK để lắng nghe realtime.

Endpoint:
  GET  /consultations/{id}/        — Chi tiết + trạng thái
  POST /consultations/{id}/start/  — Mở phòng → sync metadata lên Firebase
  POST /consultations/{id}/end/    — Đóng phòng → cập nhật Firebase
  POST /consultations/{id}/sync/   — (Admin/Doctor) Force sync metadata lên Firebase
"""

import logging

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Consultation
from ..permissions import IsAuthenticatedWithValidToken, HasDoctorOrAdminScope
from ..serializers import ConsultationSerializer

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Firebase helper
# ─────────────────────────────────────────────

def _sync_consultation_to_firebase(consultation: Consultation) -> bool:
    """
    Ghi metadata của consultation lên Firestore.
    Trả về True nếu thành công, False nếu Firebase chưa cấu hình.

    Cấu trúc Firestore:
      consultations/{consultation_id}
        ├── appointmentId:  int
        ├── status:         "waiting" | "active" | "ended"
        ├── startedAt:      Timestamp | null
        ├── endedAt:        Timestamp | null
        ├── patientUid:     "clinic_{patient_user_id}"
        ├── doctorUid:      "clinic_{doctor_user_id}"
        └── participants:   ["clinic_X", "clinic_Y"]
    """
    try:
        import firebase_admin
        from firebase_admin import firestore

        if not firebase_admin._apps:
            logger.warning("Firebase chưa khởi tạo — bỏ qua sync.")
            return False

        db = firestore.client()
        doc_ref = db.collection("consultations").document(str(consultation.pk))

        patient_uid = f"clinic_{consultation.appointment.patient.user_id}"
        doctor_uid = f"clinic_{consultation.appointment.doctor.user_id}"

        doc_ref.set(
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
            merge=True,   # merge=True để không xóa messages sub-collection
        )
        return True

    except ImportError:
        logger.error("firebase-admin chưa được cài. Chạy: pip install firebase-admin")
        return False
    except Exception as exc:
        logger.exception("Lỗi khi sync Consultation #%s lên Firebase: %s", consultation.pk, exc)
        return False


# ─────────────────────────────────────────────
# ViewSet
# ─────────────────────────────────────────────

class ConsultationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consultation ViewSet — chỉ read từ DB.
    Chat thực tế dùng Firebase SDK phía client (realtime).

    Luồng:
      1. Appointment được tạo → (signal) tạo Consultation record.
      2. Doctor gọi POST /start/ → status = active, sync lên Firebase.
      3. Client dùng firebase_token (từ /auth/firebase-token/) để chat.
      4. Doctor gọi POST /end/   → status = ended, sync lên Firebase.
    """
    queryset = Consultation.objects.select_related(
        "appointment__patient__user",
        "appointment__doctor__user",
    )
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticatedWithValidToken]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        token = getattr(self.request, "auth", None)
        token_scopes = set(token.scope.split()) if token else set()

        if "admin" in token_scopes:
            return qs
        if "doctor" in token_scopes:
            return qs.filter(appointment__doctor__user=user)
        if "patient" in token_scopes:
            return qs.filter(appointment__patient__user=user)
        return qs.none()

    # ── start ──────────────────────────────────

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[HasDoctorOrAdminScope],
        url_path="start",
    )
    def start(self, request, pk=None):
        """
        POST /consultations/{id}/start/
        Bác sĩ / admin mở phòng tư vấn.
        Sau khi gọi endpoint này, client dùng Firebase SDK để nhắn tin.
        """
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ACTIVE:
            return Response(
                {"detail": "Phiên tư vấn đã đang diễn ra."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên tư vấn đã kết thúc, không thể mở lại."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation.status = Consultation.Status.ACTIVE
        consultation.started_at = timezone.now()
        consultation.save(update_fields=["status", "started_at"])

        synced = _sync_consultation_to_firebase(consultation)

        data = ConsultationSerializer(consultation).data
        data["firebase_synced"] = synced
        data["firebase_path"] = f"consultations/{consultation.pk}/messages"
        return Response(data, status=status.HTTP_200_OK)

    # ── end ────────────────────────────────────

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[HasDoctorOrAdminScope],
        url_path="end",
    )
    def end(self, request, pk=None):
        """
        POST /consultations/{id}/end/
        Kết thúc phiên tư vấn — cập nhật DB + Firebase.
        """
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên tư vấn đã kết thúc rồi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation.status = Consultation.Status.ENDED
        consultation.ended_at = timezone.now()
        consultation.save(update_fields=["status", "ended_at"])

        _sync_consultation_to_firebase(consultation)

        return Response(
            {
                "detail": "Phiên tư vấn đã kết thúc.",
                "duration_minutes": consultation.get_duration_minutes(),
            }
        )

    # ── sync (force) ───────────────────────────

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[HasDoctorOrAdminScope],
        url_path="sync",
    )
    def sync(self, request, pk=None):
        """
        POST /consultations/{id}/sync/
        Force đồng bộ metadata lên Firebase (dùng khi Firebase mất sync).
        """
        consultation = self.get_object()
        synced = _sync_consultation_to_firebase(consultation)

        if synced:
            return Response({"detail": "Đồng bộ Firebase thành công."})
        return Response(
            {"detail": "Không thể đồng bộ Firebase. Kiểm tra cấu hình server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )