"""
test_api_payment.py — Kiểm thử API Thanh toán (Payment).

Chạy: python manage.py test clinic_app.tests.test_api_payment

Lưu ý về Payment flow:
  - POST /payments/init/ → chỉ IsPatient (bệnh nhân tự khởi tạo)
  - GET  /payments/      → IsAuthenticated (xem lịch sử)
  - POST /payments/{id}/confirm/ → IsStaff (nhân viên xác nhận)
"""

from datetime import timedelta
from django.utils import timezone

from clinic_app.models import Appointment, Doctor, Patient, DoctorSchedule, Payment

from .base import BaseAPITestCase, make_user


PAYMENTS_URL = "/payments/"


def _make_schedule(doctor):
    date = (timezone.now() + timedelta(days=1)).date()
    sch, _ = DoctorSchedule.objects.get_or_create(
        doctor=doctor, date=date, start_time="09:00",
        defaults={"end_time": "17:00", "max_appointments": 10},
    )
    return sch


def _make_appointment(patient, doctor, schedule, status="completed"):
    return Appointment.objects.create(
        patient=patient,
        doctor=doctor,
        schedule=schedule,
        appointment_date=timezone.now() + timedelta(days=1),
        status=status,
    )


class PaymentInitTests(BaseAPITestCase):
    """POST /payments/init/ — Khởi tạo thanh toán (chỉ Patient)."""

    def setUp(self):
        super().setUp()
        self.doctor = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = _make_schedule(self.doctor)
        self.appointment = _make_appointment(self.patient, self.doctor, self.schedule)

    def _payload(self):
        # PaymentInitSerializer yêu cầu: appointment_id + payment_method
        return {
            "appointment_id": self.appointment.id,
            "payment_method": "cash",
        }

    def test_patient_can_init_payment(self):
        """Bệnh nhân khởi tạo thanh toán cho lịch hẹn của chính mình."""
        self.auth(self.patient_user)
        res = self.client.post(f"{PAYMENTS_URL}init/", self._payload(), format="json")
        self.assertIn(res.status_code, [200, 201], res.data)
        self.assertIn("payment_id", res.data)

    def test_unauthenticated_cannot_init(self):
        res = self.client.post(f"{PAYMENTS_URL}init/", self._payload(), format="json")
        self.assertEqual(res.status_code, 401)

    def test_staff_cannot_init_for_patient(self):
        """Staff không phải patient → không dùng init endpoint."""
        staff = make_user("staff_pay@test.com", role="staff")
        self.auth(staff)
        res = self.client.post(f"{PAYMENTS_URL}init/", self._payload(), format="json")
        self.assertEqual(res.status_code, 403)


class PaymentListTests(BaseAPITestCase):
    """GET /payments/ — Lịch sử thanh toán."""

    def setUp(self):
        super().setUp()
        self.doctor = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = _make_schedule(self.doctor)
        self.appointment = _make_appointment(self.patient, self.doctor, self.schedule)

        # Tạo Payment trực tiếp (đúng field: payment_method, patient)
        Payment.objects.create(
            appointment=self.appointment,
            patient=self.patient,           # ← bắt buộc có patient
            amount=250_000,
            payment_method="cash",          # ← đúng tên field
            status="pending",
        )

    def test_patient_can_list_own_payments(self):
        self.auth(self.patient_user)
        res = self.client.get(PAYMENTS_URL)
        self.assertEqual(res.status_code, 200)

    def test_admin_can_list_all_payments(self):
        self.auth(self.admin)
        res = self.client.get(PAYMENTS_URL)
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_cannot_list(self):
        res = self.client.get(PAYMENTS_URL)
        self.assertEqual(res.status_code, 401)


class PaymentConfirmTests(BaseAPITestCase):
    """POST /payments/{id}/confirm/ — Xác nhận thanh toán (Staff)."""

    def setUp(self):
        super().setUp()
        self.staff_user = make_user("staff_confirm@test.com", role="staff")
        self.doctor = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = _make_schedule(self.doctor)
        self.appointment = _make_appointment(self.patient, self.doctor, self.schedule)
        self.payment = Payment.objects.create(
            appointment=self.appointment,
            patient=self.patient,
            amount=250_000,
            payment_method="cash",
            status="pending",
        )

    def test_staff_can_confirm_payment(self):
        self.auth(self.staff_user)
        res = self.client.post(
            f"{PAYMENTS_URL}{self.payment.id}/confirm/",
            {"transaction_id": "TXN-001"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "success")

    def test_patient_cannot_confirm_payment(self):
        self.auth(self.patient_user)
        res = self.client.post(f"{PAYMENTS_URL}{self.payment.id}/confirm/", {})
        self.assertEqual(res.status_code, 403)