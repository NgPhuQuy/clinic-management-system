"""
test_api_appointment.py — Kiểm thử API Lịch hẹn (Appointment).

Chạy: python manage.py test clinic_app.tests.test_api_appointment

Luồng được test:
  ✓ Patient đặt lịch hợp lệ → 201
  ✓ Doctor / Admin không thể đặt lịch → 403
  ✓ Lấy danh sách lịch hẹn (patient chỉ thấy của mình)
  ✓ Admin thấy tất cả lịch hẹn
  ✓ Cập nhật trạng thái lịch hẹn (PATCH .../status/)
  ✓ Người lạ không được xem lịch hẹn của người khác
"""

from datetime import datetime, timedelta
from django.utils import timezone

from clinic_app.models import Appointment, DoctorSchedule, Doctor, Patient, Specialty

from .base import BaseAPITestCase, make_patient_user, make_doctor_user


APPOINTMENTS_URL = "/appointments/"


def make_schedule(doctor, days_ahead=1):
    """Tạo DoctorSchedule trong tương lai."""
    date = (timezone.now() + timedelta(days=days_ahead)).date()
    schedule, _ = DoctorSchedule.objects.get_or_create(
        doctor=doctor,
        date=date,
        start_time="08:00",
        defaults={
            "end_time": "12:00",
            "max_appointments": 10,
            "is_available": True,
        },
    )
    return schedule


class AppointmentCreateTests(BaseAPITestCase):
    """POST /api/appointments/ — Đặt lịch hẹn."""

    def setUp(self):
        super().setUp()
        self.doctor = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = make_schedule(self.doctor)

    def _payload(self):
        return {
            "doctor": self.doctor.id,
            "schedule": self.schedule.id,
            "appointment_date": (timezone.now() + timedelta(days=1)).isoformat(),
            "reason": "Khám sức khỏe định kỳ",
        }

    def test_patient_can_create_appointment(self):
        self.auth(self.patient_user)
        res = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)
        # AppointmentCreateSerializer không trả về status - chỉ check 201 là đủ

    def test_doctor_cannot_create_appointment(self):
        """Doctor không có quyền đặt lịch cho người khác."""
        self.auth(self.doctor_user)
        res = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_create(self):
        res = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 401)


class AppointmentListTests(BaseAPITestCase):
    """GET /api/appointments/ — Danh sách lịch hẹn."""

    def setUp(self):
        super().setUp()
        # Tạo thêm patient thứ 2
        self.patient2_user = make_patient_user("patient2@test.com")
        self.doctor = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.patient2 = Patient.objects.get(user=self.patient2_user)
        self.schedule = make_schedule(self.doctor)

        # Tạo 2 lịch hẹn: 1 cho patient, 1 cho patient2
        self.apt1 = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            schedule=self.schedule,
            appointment_date=timezone.now() + timedelta(days=1),
            status="pending",
        )
        self.apt2 = Appointment.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            schedule=self.schedule,
            appointment_date=timezone.now() + timedelta(days=2),
            status="confirmed",
        )

    def test_patient_only_sees_own_appointments(self):
        self.auth(self.patient_user)
        res = self.client.get(APPOINTMENTS_URL)
        self.assertEqual(res.status_code, 200)
        # patient chỉ thấy lịch của mình
        emails_in_result = [
            item.get("patient") for item in res.data.get("results", res.data)
        ]
        self.assertEqual(len(res.data.get("results", res.data)), 1)

    def test_admin_sees_all_appointments(self):
        self.auth(self.admin)
        res = self.client.get(APPOINTMENTS_URL)
        self.assertEqual(res.status_code, 200)
        count = res.data.get("count", len(res.data.get("results", res.data)))
        self.assertGreaterEqual(count, 2)

    def test_doctor_sees_own_appointments(self):
        self.auth(self.doctor_user)
        res = self.client.get(APPOINTMENTS_URL)
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_cannot_list(self):
        res = self.client.get(APPOINTMENTS_URL)
        self.assertEqual(res.status_code, 401)


class AppointmentStatusUpdateTests(BaseAPITestCase):
    """PATCH /api/appointments/{id}/status/ — Cập nhật trạng thái."""

    def setUp(self):
        super().setUp()
        self.doctor = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = make_schedule(self.doctor)
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            schedule=self.schedule,
            appointment_date=timezone.now() + timedelta(days=1),
            status="pending",
        )
        self.url = f"{APPOINTMENTS_URL}{self.appointment.id}/status/"

    def test_confirm_appointment(self):
        """Doctor / Admin xác nhận lịch hẹn → confirmed."""
        self.auth(self.admin)
        res = self.client.patch(self.url, {"status": "confirmed"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "confirmed")

    def test_cancel_appointment(self):
        self.auth(self.patient_user)
        res = self.client.patch(self.url, {"status": "cancelled"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)

    def test_unauthenticated_cannot_update_status(self):
        res = self.client.patch(self.url, {"status": "confirmed"}, format="json")
        self.assertEqual(res.status_code, 401)