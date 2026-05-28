"""
test_api_prescription.py — Kiểm thử API Đơn thuốc & Cấp phát (Prescription).

Chạy: python manage.py test clinic_app.tests.test_api_prescription

Luồng được test:
  ✓ Bác sĩ tạo đơn thuốc gắn với hồ sơ bệnh án → 201
  ✓ Patient / admin không thể tạo đơn → 403
  ✓ Chưa đăng nhập → 401
  ✓ Patient chỉ xem đơn thuốc của mình
  ✓ Doctor chỉ xem đơn thuốc bệnh nhân mình kê
  ✓ Admin xem tất cả đơn
  ✓ Bác sĩ thêm thuốc vào đơn (add_medicine) → 201
  ✓ Không thể thêm thuốc vào đơn đã cấp phát
  ✓ Admin cấp phát đơn thuốc (dispense) → 200, status=dispensed
  ✓ Patient không thể cấp phát → 403
  ✓ Cấp phát đơn đã dispensed → 400
  ✓ Cấp phát khi tồn kho không đủ → 400 với chi tiết lỗi
  ✓ FEFO: cấp phát trừ kho theo hạn sớm nhất trước
"""

from datetime import date, timedelta

from django.utils import timezone

from clinic_app.models import (
    Appointment, Doctor, DoctorSchedule, Inventory,
    Medicine, MedicalRecord, MedicineCategory, Patient, Prescription, PrescriptionDetail,
)

from .base_test import BaseAPITestCase, make_doctor_user, make_patient_user

PRESCRIPTIONS_URL = "/prescriptions/"


def _make_schedule(doctor):
    d = (timezone.now() + timedelta(days=1)).date()
    sch, _ = DoctorSchedule.objects.get_or_create(
        doctor=doctor, date=d, start_time="08:00",
        defaults={"end_time": "12:00", "max_appointments": 10},
    )
    return sch


def _make_appointment(patient, doctor, schedule, status="confirmed"):
    return Appointment.objects.create(
        patient=patient,
        doctor=doctor,
        schedule=schedule,
        appointment_date=timezone.now() + timedelta(days=1),
        status=status,
    )


def _make_record(patient, doctor, appointment=None):
    return MedicalRecord.objects.create(
        patient=patient,
        doctor=doctor,
        appointment=appointment,
        diagnosis="Viêm họng",
        symptoms="Đau họng",
    )


def _make_medicine(name="Amoxicillin", code="AMX-PRX"):
    cat, _ = MedicineCategory.objects.get_or_create(name="Kháng sinh")
    med, _ = Medicine.objects.get_or_create(
        code=code,
        defaults={
            "name": name,
            "category": cat,
            "unit": "viên",
            "price": 5_000,
            "requires_prescription": True,
        },
    )
    return med


def _make_inventory(medicine, quantity=100, expiry_days=180):
    inv, _ = Inventory.objects.get_or_create(
        medicine=medicine,
        batch_number=f"BATCH-PRX-{expiry_days}",
        defaults={
            "quantity": quantity,
            "expiry_date": date.today() + timedelta(days=expiry_days),
            "import_price": 3_000,
            "warning_threshold": 10,
        },
    )
    return inv


class PrescriptionCreateTests(BaseAPITestCase):
    """POST /prescriptions/ — Kê đơn thuốc."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule    = _make_schedule(self.doctor)
        self.appointment = _make_appointment(self.patient, self.doctor, self.schedule)
        self.record  = _make_record(self.patient, self.doctor, self.appointment)

    def _payload(self):
        return {
            "medical_record": self.record.id,
            "notes": "Uống sau ăn",
        }

    def test_doctor_can_create_prescription(self):
        self.auth(self.doctor_user)
        res = self.client.post(PRESCRIPTIONS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["status"], "pending")

    def test_patient_cannot_create_prescription(self):
        self.auth(self.patient_user)
        res = self.client.post(PRESCRIPTIONS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_admin_cannot_create_prescription(self):
        """Admin không có doctor scope → không thể kê đơn."""
        self.auth(self.admin)
        res = self.client.post(PRESCRIPTIONS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_create(self):
        res = self.client.post(PRESCRIPTIONS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 401)

    def test_one_prescription_per_medical_record(self):
        """Hồ sơ đã có đơn thuốc → tạo thêm phải báo lỗi (OneToOne)."""
        Prescription.objects.create(medical_record=self.record)
        self.auth(self.doctor_user)
        res = self.client.post(PRESCRIPTIONS_URL, self._payload(), format="json")
        self.assertIn(res.status_code, [400, 409])


class PrescriptionListTests(BaseAPITestCase):
    """GET /prescriptions/ — Phân quyền xem đơn thuốc."""

    def setUp(self):
        super().setUp()
        self.doctor   = Doctor.objects.get(user=self.doctor_user)
        self.patient  = Patient.objects.get(user=self.patient_user)
        self.patient2_user = make_patient_user("patient2_prx@test.com")
        self.patient2 = Patient.objects.get(user=self.patient2_user)
        self.doctor2_user  = make_doctor_user("doctor2_prx@test.com")
        self.doctor2  = Doctor.objects.get(user=self.doctor2_user)

        self.record1 = _make_record(self.patient, self.doctor)
        self.record2 = _make_record(self.patient2, self.doctor2)
        self.prx1    = Prescription.objects.create(medical_record=self.record1)
        self.prx2    = Prescription.objects.create(medical_record=self.record2)

    def test_patient_sees_own_prescriptions(self):
        self.auth(self.patient_user)
        res = self.client.get(PRESCRIPTIONS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [p["id"] for p in results]
        self.assertIn(self.prx1.id, ids)
        self.assertNotIn(self.prx2.id, ids)

    def test_doctor_sees_own_prescriptions(self):
        self.auth(self.doctor_user)
        res = self.client.get(PRESCRIPTIONS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [p["id"] for p in results]
        self.assertIn(self.prx1.id, ids)
        self.assertNotIn(self.prx2.id, ids)

    def test_admin_sees_all_prescriptions(self):
        self.auth(self.admin)
        res = self.client.get(PRESCRIPTIONS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [p["id"] for p in results]
        self.assertIn(self.prx1.id, ids)
        self.assertIn(self.prx2.id, ids)

    def test_unauthenticated_cannot_list(self):
        res = self.client.get(PRESCRIPTIONS_URL)
        self.assertEqual(res.status_code, 401)


class PrescriptionAddMedicineTests(BaseAPITestCase):
    """POST /prescriptions/{id}/add_medicine/ — Thêm thuốc vào đơn."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.record  = _make_record(self.patient, self.doctor)
        self.prx     = Prescription.objects.create(
            medical_record=self.record, status="pending"
        )
        self.medicine = _make_medicine()
        self.url      = f"{PRESCRIPTIONS_URL}{self.prx.id}/add_medicine/"

    def _payload(self):
        return {
            "medicine":      self.medicine.id,
            "quantity":      14,
            "dosage":        "1 viên",
            "frequency":     "2 lần/ngày",
            "duration_days": 7,
            "instructions":  "Uống sau ăn",
        }

    def test_doctor_can_add_medicine(self):
        self.auth(self.doctor_user)
        res = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["quantity"], 14)

    def test_patient_cannot_add_medicine(self):
        self.auth(self.patient_user)
        res = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_cannot_add_to_dispensed_prescription(self):
        """Đơn đã cấp phát không được thêm thuốc."""
        self.prx.status = Prescription.Status.DISPENSED
        self.prx.save()
        self.auth(self.doctor_user)
        res = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("detail", res.data)

    def test_cannot_add_to_cancelled_prescription(self):
        """Đơn đã hủy không được thêm thuốc."""
        self.prx.status = Prescription.Status.CANCELLED
        self.prx.save()
        self.auth(self.doctor_user)
        res = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(res.status_code, 400)


class PrescriptionDispenseTests(BaseAPITestCase):
    """POST /prescriptions/{id}/dispense/ — Cấp phát thuốc."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.record  = _make_record(self.patient, self.doctor)
        self.prx     = Prescription.objects.create(
            medical_record=self.record, status="pending"
        )
        self.medicine = _make_medicine(code="DISP-001")
        # Nhập kho đủ hàng
        self.inventory = _make_inventory(self.medicine, quantity=100, expiry_days=180)
        # Thêm thuốc vào đơn
        PrescriptionDetail.objects.create(
            prescription=self.prx,
            medicine=self.medicine,
            quantity=10,
            dosage="1 viên",
            frequency="2 lần/ngày",
            duration_days=5,
        )
        self.url = f"{PRESCRIPTIONS_URL}{self.prx.id}/dispense/"

    def test_admin_can_dispense(self):
        self.auth(self.admin)
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, 200, res.data)
        self.prx.refresh_from_db()
        self.assertEqual(self.prx.status, "dispensed")

    def test_patient_cannot_dispense(self):
        self.auth(self.patient_user)
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, 403)

    def test_doctor_cannot_dispense(self):
        self.auth(self.doctor_user)
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_dispense(self):
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, 401)

    def test_cannot_dispense_already_dispensed(self):
        """Đơn đã cấp phát → báo lỗi 400."""
        self.auth(self.admin)
        self.client.post(self.url)  # cấp phát lần 1
        res = self.client.post(self.url)  # cấp phát lần 2
        self.assertEqual(res.status_code, 400)
        self.assertIn("detail", res.data)

    def test_dispense_deducts_inventory(self):
        """Sau khi cấp phát, tồn kho giảm đúng số lượng."""
        before_qty = self.inventory.quantity
        self.auth(self.admin)
        self.client.post(self.url)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, before_qty - 10)

    def test_dispense_fails_when_insufficient_stock(self):
        """Tồn kho không đủ → 400 với danh sách thuốc thiếu."""
        self.inventory.quantity = 2  # chỉ có 2, cần 10
        self.inventory.save()
        self.auth(self.admin)
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, 400)
        self.assertIn("errors", res.data)
        self.assertIn(self.medicine.name, str(res.data["errors"]))


class PrescriptionFEFOTests(BaseAPITestCase):
    """
    Kiểm thử cấp phát theo FEFO (First Expired First Out).
    Khi có nhiều lô hàng, lô hết hạn sớm nhất phải được dùng trước.
    """

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.record  = _make_record(self.patient, self.doctor)
        self.prx     = Prescription.objects.create(
            medical_record=self.record, status="pending"
        )
        self.medicine = _make_medicine(code="FEFO-001")

        # Lô hết hạn sớm hơn (FEFO sẽ dùng trước)
        self.batch_early = Inventory.objects.create(
            medicine=self.medicine,
            batch_number="BATCH-EARLY",
            quantity=5,
            expiry_date=date.today() + timedelta(days=30),
            import_price=3_000,
            warning_threshold=2,
        )
        # Lô hết hạn muộn hơn
        self.batch_late = Inventory.objects.create(
            medicine=self.medicine,
            batch_number="BATCH-LATE",
            quantity=50,
            expiry_date=date.today() + timedelta(days=365),
            import_price=3_000,
            warning_threshold=5,
        )
        PrescriptionDetail.objects.create(
            prescription=self.prx,
            medicine=self.medicine,
            quantity=7,  # cần 7: lấy hết 5 từ BATCH-EARLY, thêm 2 từ BATCH-LATE
            dosage="1 viên",
            frequency="2 lần/ngày",
            duration_days=7,
        )
        self.url = f"{PRESCRIPTIONS_URL}{self.prx.id}/dispense/"

    def test_fefo_deducts_earliest_batch_first(self):
        """FEFO: lô hết hạn sớm hơn bị trừ trước."""
        self.auth(self.admin)
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, 200, res.data)

        self.batch_early.refresh_from_db()
        self.batch_late.refresh_from_db()

        # BATCH-EARLY có 5 viên, tất cả bị trừ hết
        self.assertEqual(self.batch_early.quantity, 0)
        # BATCH-LATE còn lại 50 - 2 = 48
        self.assertEqual(self.batch_late.quantity, 48)
