"""
test_api_payment.py — Kiểm thử API Thanh toán (Payment).

Chạy: python manage.py test clinic_app.tests.test_api_payment

BUG ĐÃ SỬA:
  1. make_user(role="staff") → role không hợp lệ sau migration 0003.
     Fix: xóa tất cả staff user, dùng admin thay thế.
  2. test_staff_can_confirm_payment() → staff không còn → admin confirm.
  3. test_staff_cannot_init_for_patient() → đổi sang test_doctor_cannot_init_payment()
     (doctor cũng không phải patient, không nên init payment thay họ).
  4. PaymentViewSet.get_queryset() cũ dùng user.role → đã sửa dùng scope.
     Test phản ánh đúng behavior mới (patient scope → chỉ thấy của mình).

Luồng được test:
  ✓ Bệnh nhân khởi tạo thanh toán cho lịch hẹn của mình → 200/201
  ✓ Chưa đăng nhập → 401
  ✓ Doctor/Admin không dùng init endpoint → 403
  ✓ Bệnh nhân xem lịch sử thanh toán của mình → 200
  ✓ Admin xem tất cả thanh toán → 200
  ✓ Chưa đăng nhập → 401
  ✓ Admin xác nhận thanh toán → 200 (BUG FIX: trước là staff)
  ✓ Bệnh nhân không thể xác nhận → 403
"""

from datetime import timedelta
from django.utils import timezone

from clinic_app.models import Appointment, Doctor, Patient, DoctorSchedule, Payment

from .base_test import BaseAPITestCase, make_user


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
    """POST /payments/init/ — Khởi tạo thanh toán (chỉ Patient scope)."""

    def setUp(self):
        super().setUp()
        self.doctor = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule = _make_schedule(self.doctor)
        self.appointment = _make_appointment(self.patient, self.doctor, self.schedule)

    def _payload(self):
        return {
            "appointment_id": self.appointment.id,
            "payment_method": "cash",
        }

    def test_patient_can_init_payment(self):
        """Bệnh nhân khởi tạo thanh toán cho lịch hẹn của mình."""
        self.auth(self.patient_user)
        res = self.client.post(f"{PAYMENTS_URL}init/", self._payload(), format="json")
        self.assertIn(res.status_code, [200, 201], res.data)
        self.assertIn("payment_id", res.data)

    def test_unauthenticated_cannot_init(self):
        res = self.client.post(f"{PAYMENTS_URL}init/", self._payload(), format="json")
        self.assertEqual(res.status_code, 401)

    def test_doctor_cannot_init_payment(self):
        """
        BUG FIX: trước là test_staff_cannot_init_for_patient() với role='staff'.
        Doctor scope cũng không có quyền gọi init endpoint (scope 'patient' required).
        """
        self.auth(self.doctor_user)
        res = self.client.post(f"{PAYMENTS_URL}init/", self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_admin_cannot_init_payment_as_patient(self):
        """Admin scope cũng không thể init payment thay patient."""
        self.auth(self.admin)
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

        Payment.objects.create(
            appointment=self.appointment,
            patient=self.patient,
            amount=250_000,
            payment_method="cash",
            status="pending",
        )

    def test_patient_can_list_own_payments(self):
        self.auth(self.patient_user)
        res = self.client.get(PAYMENTS_URL)
        self.assertEqual(res.status_code, 200)
        # Patient scope → chỉ thấy thanh toán của mình
        results = res.data.get("results", res.data)
        for payment in results:
            self.assertEqual(payment["patient"], self.patient.id)

    def test_admin_can_list_all_payments(self):
        self.auth(self.admin)
        res = self.client.get(PAYMENTS_URL)
        self.assertEqual(res.status_code, 200)

    def test_doctor_can_list_payments(self):
        """Doctor scope → có thể xem payments (cần xem bệnh nhân đã trả chưa)."""
        self.auth(self.doctor_user)
        res = self.client.get(PAYMENTS_URL)
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_cannot_list(self):
        res = self.client.get(PAYMENTS_URL)
        self.assertEqual(res.status_code, 401)


class PaymentConfirmTests(BaseAPITestCase):
    """
    POST /payments/{id}/confirm/ — Xác nhận thanh toán.

    BUG FIX:
      - Trước: staff_user (role="staff" không hợp lệ) xác nhận thanh toán.
      - Nay: Admin xác nhận thanh toán (staff đã bị loại).
      - PaymentViewSet.confirm action trước không có permission → bất kỳ ai cũng confirm được.
      - Nay: chỉ HasAdminScope mới confirm được.
    """

    def setUp(self):
        super().setUp()
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

    def test_admin_can_confirm_payment(self):
        """BUG FIX: trước là test_staff_can_confirm_payment với role='staff'."""
        self.auth(self.admin)
        res = self.client.post(
            f"{PAYMENTS_URL}{self.payment.id}/confirm/",
            {"transaction_id": "TXN-001"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "success")

    def test_patient_cannot_confirm_payment(self):
        """Bệnh nhân không thể tự xác nhận thanh toán của mình."""
        self.auth(self.patient_user)
        res = self.client.post(f"{PAYMENTS_URL}{self.payment.id}/confirm/", {})
        self.assertEqual(res.status_code, 403)

    def test_doctor_cannot_confirm_payment(self):
        """Doctor cũng không có quyền xác nhận thanh toán."""
        self.auth(self.doctor_user)
        res = self.client.post(f"{PAYMENTS_URL}{self.payment.id}/confirm/", {})
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_confirm(self):
        res = self.client.post(f"{PAYMENTS_URL}{self.payment.id}/confirm/", {})
        self.assertEqual(res.status_code, 401)