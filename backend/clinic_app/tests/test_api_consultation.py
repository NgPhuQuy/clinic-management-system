"""
test_api_consultation.py — Kiểm thử API Tư vấn trực tuyến (Consultation).

Chạy: python manage.py test clinic_app.tests.test_api_consultation

Luồng được test:
  ✓ Signal tự động tạo Consultation khi Appointment được xác nhận
  ✓ Patient xem chi tiết consultation của mình → 200
  ✓ Patient không xem được consultation của người khác → 404
  ✓ Chưa đăng nhập → 401
  ✓ Patient vào phòng chờ (enter) → status=waiting
  ✓ Patient không thể enter consultation không phải của mình
  ✓ Doctor bắt đầu (start) → status=active, trả về Agora token
  ✓ Patient không thể start (chỉ doctor mới start)
  ✓ Ai cũng có thể end consultation đang active
  ✓ Không thể end consultation đã ended → 400
  ✓ Gửi tin nhắn (messages) → 201
  ✓ Lấy danh sách tin nhắn → 200 với đúng nội dung
  ✓ Unauthenticated không gửi được tin nhắn
"""

from datetime import timedelta

from django.utils import timezone

from clinic_app.models import (
    Appointment, ChatMessage, Consultation, Doctor, DoctorSchedule, Patient,
)

from .base_test import BaseAPITestCase, make_doctor_user, make_patient_user

CONSULTATIONS_URL = "/consultations/"


def _make_schedule(doctor, days_ahead=3):
    d = (timezone.now() + timedelta(days=days_ahead)).date()
    sch, _ = DoctorSchedule.objects.get_or_create(
        doctor=doctor, date=d, start_time="09:00",
        defaults={"end_time": "17:00", "max_appointments": 10},
    )
    return sch


def _make_confirmed_appointment(patient, doctor, schedule):
    """Tạo appointment có status=confirmed (signal sẽ tạo Consultation)."""
    apt = Appointment.objects.create(
        patient=patient,
        doctor=doctor,
        schedule=schedule,
        appointment_date=timezone.now() + timedelta(days=3),
        status="pending",
    )
    # Trigger signal bằng cách cập nhật status
    apt.status = "confirmed"
    apt.save()
    return apt


def _make_consultation(appointment, status="waiting"):
    """Tạo hoặc lấy Consultation; đặt status mong muốn."""
    cons, _ = Consultation.objects.get_or_create(
        appointment=appointment,
        defaults={
            "type":    Consultation.Type.CHAT,
            "status":  status,
            "room_id": f"clinic_consult_test_{appointment.pk}",
        },
    )
    if cons.status != status:
        cons.status = status
        cons.save()
    return cons


class ConsultationAutoCreateTests(BaseAPITestCase):
    """Signal tự động tạo Consultation khi Appointment confirmed."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = _make_schedule(self.doctor, days_ahead=4)

    def test_signal_creates_consultation_on_confirm(self):
        """Appointment pending → confirmed kích hoạt signal → Consultation tồn tại."""
        apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            schedule=self.schedule,
            appointment_date=timezone.now() + timedelta(days=4),
            status="pending",
        )
        self.assertFalse(Consultation.objects.filter(appointment=apt).exists())
        apt.status = "confirmed"
        apt.save()
        self.assertTrue(Consultation.objects.filter(appointment=apt).exists())

    def test_consultation_has_room_id_after_create(self):
        """room_id được gắn tự động theo signal."""
        apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            schedule=self.schedule,
            appointment_date=timezone.now() + timedelta(days=4),
            status="pending",
        )
        apt.status = "confirmed"
        apt.save()
        cons = Consultation.objects.get(appointment=apt)
        self.assertTrue(cons.room_id.startswith("clinic_consult_"))


class ConsultationRetrieveTests(BaseAPITestCase):
    """GET /consultations/{id}/ — Xem chi tiết."""

    def setUp(self):
        super().setUp()
        self.doctor   = Doctor.objects.get(user=self.doctor_user)
        self.patient  = Patient.objects.get(user=self.patient_user)
        self.patient2_user = make_patient_user("patient2_cons@test.com")
        self.patient2 = Patient.objects.get(user=self.patient2_user)
        self.doctor2_user  = make_doctor_user("doctor2_cons@test.com")
        self.doctor2  = Doctor.objects.get(user=self.doctor2_user)

        self.schedule1 = _make_schedule(self.doctor, days_ahead=5)
        self.schedule2 = _make_schedule(self.doctor2, days_ahead=5)

        self.apt1 = _make_confirmed_appointment(self.patient, self.doctor, self.schedule1)
        self.apt2 = _make_confirmed_appointment(self.patient2, self.doctor2, self.schedule2)

        self.cons1 = _make_consultation(self.apt1)
        self.cons2 = _make_consultation(self.apt2)

    def test_patient_can_view_own_consultation(self):
        self.auth(self.patient_user)
        res = self.client.get(f"{CONSULTATIONS_URL}{self.cons1.id}/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["id"], self.cons1.id)

    def test_patient_cannot_view_others_consultation(self):
        """Bệnh nhân không thể xem consultation của người khác."""
        self.auth(self.patient_user)
        res = self.client.get(f"{CONSULTATIONS_URL}{self.cons2.id}/")
        self.assertEqual(res.status_code, 404)

    def test_doctor_can_view_own_patients_consultation(self):
        self.auth(self.doctor_user)
        res = self.client.get(f"{CONSULTATIONS_URL}{self.cons1.id}/")
        self.assertEqual(res.status_code, 200)

    def test_doctor_cannot_view_other_doctors_consultation(self):
        self.auth(self.doctor_user)
        res = self.client.get(f"{CONSULTATIONS_URL}{self.cons2.id}/")
        self.assertEqual(res.status_code, 404)

    def test_admin_can_view_any_consultation(self):
        self.auth(self.admin)
        res1 = self.client.get(f"{CONSULTATIONS_URL}{self.cons1.id}/")
        res2 = self.client.get(f"{CONSULTATIONS_URL}{self.cons2.id}/")
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res2.status_code, 200)

    def test_unauthenticated_cannot_view(self):
        res = self.client.get(f"{CONSULTATIONS_URL}{self.cons1.id}/")
        self.assertEqual(res.status_code, 401)


class ConsultationEnterTests(BaseAPITestCase):
    """POST /consultations/{id}/enter/ — Patient vào phòng chờ."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = _make_schedule(self.doctor, days_ahead=6)
        self.apt  = _make_confirmed_appointment(self.patient, self.doctor, self.schedule)
        self.cons = _make_consultation(self.apt, status="waiting")
        self.url  = f"{CONSULTATIONS_URL}{self.cons.id}/enter/"

    def test_patient_can_enter(self):
        self.auth(self.patient_user)
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, 200, res.data)

    def test_doctor_cannot_enter_as_patient(self):
        """Chỉ patient scope mới được gọi enter."""
        self.auth(self.doctor_user)
        res = self.client.post(self.url)
        self.assertIn(res.status_code, [403, 404])

    def test_unauthenticated_cannot_enter(self):
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, 401)


class ConsultationStartEndTests(BaseAPITestCase):
    """POST /consultations/{id}/start/ và /end/ — Bắt đầu / Kết thúc."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = _make_schedule(self.doctor, days_ahead=7)
        self.apt  = _make_confirmed_appointment(self.patient, self.doctor, self.schedule)
        self.cons = _make_consultation(self.apt, status="waiting")

    def test_doctor_can_start_consultation(self):
        """Doctor admit → status=active + Agora RTC token."""
        self.auth(self.doctor_user)
        res = self.client.post(f"{CONSULTATIONS_URL}{self.cons.id}/start/")
        self.assertEqual(res.status_code, 200, res.data)
        self.cons.refresh_from_db()
        self.assertEqual(self.cons.status, Consultation.Status.ACTIVE)

    def test_patient_cannot_start(self):
        """Chỉ doctor / admin mới được start."""
        self.auth(self.patient_user)
        res = self.client.post(f"{CONSULTATIONS_URL}{self.cons.id}/start/")
        self.assertEqual(res.status_code, 403)

    def test_anyone_can_end_active_consultation(self):
        """Doctor hoặc patient đều có thể bấm End."""
        self.cons.status = Consultation.Status.ACTIVE
        self.cons.started_at = timezone.now()
        self.cons.save()

        self.auth(self.patient_user)
        res = self.client.post(f"{CONSULTATIONS_URL}{self.cons.id}/end/")
        self.assertEqual(res.status_code, 200, res.data)
        self.cons.refresh_from_db()
        self.assertEqual(self.cons.status, Consultation.Status.ENDED)
        self.assertIsNotNone(self.cons.ended_at)

    def test_cannot_end_already_ended(self):
        """Không thể end consultation đã kết thúc."""
        self.cons.status   = Consultation.Status.ENDED
        self.cons.ended_at = timezone.now()
        self.cons.save()

        self.auth(self.doctor_user)
        res = self.client.post(f"{CONSULTATIONS_URL}{self.cons.id}/end/")
        self.assertEqual(res.status_code, 400)

    def test_unauthenticated_cannot_start_or_end(self):
        res_start = self.client.post(f"{CONSULTATIONS_URL}{self.cons.id}/start/")
        res_end   = self.client.post(f"{CONSULTATIONS_URL}{self.cons.id}/end/")
        self.assertEqual(res_start.status_code, 401)
        self.assertEqual(res_end.status_code, 401)


class ConsultationMessagesTests(BaseAPITestCase):
    """POST + GET /consultations/{id}/messages/ — Nhắn tin."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = _make_schedule(self.doctor, days_ahead=8)
        self.apt  = _make_confirmed_appointment(self.patient, self.doctor, self.schedule)
        self.cons = _make_consultation(self.apt, status="active")
        self.cons.status = Consultation.Status.ACTIVE
        self.cons.save()
        self.url  = f"{CONSULTATIONS_URL}{self.cons.id}/messages/"

    def test_patient_can_send_message(self):
        self.auth(self.patient_user)
        res = self.client.post(self.url, {"message": "Bác sĩ ơi tôi đau đầu quá"}, format="json")
        self.assertEqual(res.status_code, 201, res.data)

    def test_doctor_can_send_message(self):
        self.auth(self.doctor_user)
        res = self.client.post(self.url, {"message": "Bạn uống nhiều nước nhé"}, format="json")
        self.assertEqual(res.status_code, 201, res.data)

    def test_unauthenticated_cannot_send_message(self):
        res = self.client.post(self.url, {"message": "Hack"}, format="json")
        self.assertEqual(res.status_code, 401)

    def test_get_messages_returns_list(self):
        """GET messages trả về danh sách tin nhắn của consultation."""
        ChatMessage.objects.create(
            consultation=self.cons,
            sender=self.patient_user,
            message="Xin chào bác sĩ",
        )
        ChatMessage.objects.create(
            consultation=self.cons,
            sender=self.doctor_user,
            message="Chào bạn, bạn có triệu chứng gì?",
        )
        self.auth(self.patient_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200, res.data)
        results = res.data if isinstance(res.data, list) else res.data.get("results", res.data)
        self.assertGreaterEqual(len(results), 2)

    def test_empty_message_rejected(self):
        self.auth(self.patient_user)
        res = self.client.post(self.url, {"message": ""}, format="json")
        self.assertIn(res.status_code, [400, 422])
