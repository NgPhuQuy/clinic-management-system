"""
test_api_medical_record.py — Kiểm thử API Hồ sơ bệnh án & Kết quả cận lâm sàng.

Chạy: python manage.py test clinic_app.tests.test_api_medical_record

Luồng được test:
  ✓ Bác sĩ tạo hồ sơ bệnh án → 201
  ✓ Patient / admin không thể tạo hồ sơ → 403
  ✓ Chưa đăng nhập → 401
  ✓ Patient chỉ xem hồ sơ của mình
  ✓ Doctor chỉ xem hồ sơ bệnh nhân mình điều trị
  ✓ Admin xem tất cả hồ sơ
  ✓ Bác sĩ cập nhật hồ sơ → 200
  ✓ Patient không được cập nhật → 403
  ✓ Bác sĩ thêm kết quả cận lâm sàng → 201
  ✓ Patient xem kết quả cận lâm sàng của mình
  ✓ Patient không xem được kết quả của người khác
  ✓ Lọc kết quả theo status (ordered / completed)
"""

from datetime import date, timedelta

from django.utils import timezone

from clinic_app.models import Appointment, Doctor, DoctorSchedule, MedicalRecord, Patient, TestResult

from .base_test import BaseAPITestCase, make_doctor_user, make_patient_user

MEDICAL_RECORDS_URL = "/medical-records/"
TEST_RESULTS_URL    = "/test-results/"


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
        diagnosis="Viêm họng cấp",
        symptoms="Đau họng, sốt nhẹ",
        treatment_notes="Nghỉ ngơi, uống nhiều nước",
    )


class MedicalRecordCreateTests(BaseAPITestCase):
    """POST /medical-records/ — Tạo hồ sơ bệnh án."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.schedule    = _make_schedule(self.doctor)
        self.appointment = _make_appointment(self.patient, self.doctor, self.schedule)

    def _payload(self):
        return {
            "patient":     self.patient.id,
            "appointment": self.appointment.id,
            "diagnosis":   "Viêm phế quản",
            "symptoms":    "Ho khan, khó thở",
            "treatment_notes": "Dùng kháng sinh 7 ngày",
        }

    def test_doctor_can_create_record(self):
        self.auth(self.doctor_user)
        res = self.client.post(MEDICAL_RECORDS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["diagnosis"], "Viêm phế quản")

    def test_patient_cannot_create_record(self):
        """Bệnh nhân không thể tự tạo hồ sơ bệnh án."""
        self.auth(self.patient_user)
        res = self.client.post(MEDICAL_RECORDS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_admin_cannot_create_record(self):
        """Admin không thể tạo hồ sơ (chỉ doctor scope)."""
        self.auth(self.admin)
        res = self.client.post(MEDICAL_RECORDS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_create(self):
        res = self.client.post(MEDICAL_RECORDS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 401)

    def test_doctor_auto_set_on_create(self):
        """Doctor field tự động gắn theo user đang đăng nhập (perform_create)."""
        self.auth(self.doctor_user)
        res = self.client.post(MEDICAL_RECORDS_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 201)
        record = MedicalRecord.objects.get(pk=res.data["id"])
        self.assertEqual(record.doctor.user, self.doctor_user)


class MedicalRecordListTests(BaseAPITestCase):
    """GET /medical-records/ — Phân quyền xem."""

    def setUp(self):
        super().setUp()
        self.doctor   = Doctor.objects.get(user=self.doctor_user)
        self.patient  = Patient.objects.get(user=self.patient_user)
        self.patient2_user = make_patient_user("patient2_mr@test.com")
        self.patient2 = Patient.objects.get(user=self.patient2_user)
        self.doctor2_user  = make_doctor_user("doctor2_mr@test.com")
        self.doctor2  = Doctor.objects.get(user=self.doctor2_user)

        self.schedule = _make_schedule(self.doctor)

        # Hồ sơ do doctor1 tạo cho patient1
        self.record1 = _make_record(self.patient, self.doctor)
        # Hồ sơ do doctor2 tạo cho patient2
        self.record2 = _make_record(self.patient2, self.doctor2)

    def test_patient_only_sees_own_records(self):
        self.auth(self.patient_user)
        res = self.client.get(MEDICAL_RECORDS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [r["id"] for r in results]
        self.assertIn(self.record1.id, ids)
        self.assertNotIn(self.record2.id, ids)

    def test_doctor_only_sees_own_patients_records(self):
        self.auth(self.doctor_user)
        res = self.client.get(MEDICAL_RECORDS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [r["id"] for r in results]
        self.assertIn(self.record1.id, ids)
        self.assertNotIn(self.record2.id, ids)

    def test_admin_sees_all_records(self):
        self.auth(self.admin)
        res = self.client.get(MEDICAL_RECORDS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [r["id"] for r in results]
        self.assertIn(self.record1.id, ids)
        self.assertIn(self.record2.id, ids)

    def test_unauthenticated_cannot_list(self):
        res = self.client.get(MEDICAL_RECORDS_URL)
        self.assertEqual(res.status_code, 401)


class MedicalRecordUpdateTests(BaseAPITestCase):
    """PUT/PATCH /medical-records/{id}/ — Cập nhật hồ sơ."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.record  = _make_record(self.patient, self.doctor)
        self.url     = f"{MEDICAL_RECORDS_URL}{self.record.id}/"

    def test_doctor_can_update_record(self):
        self.auth(self.doctor_user)
        res = self.client.patch(self.url, {"diagnosis": "Viêm họng mãn tính"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.record.refresh_from_db()
        self.assertEqual(self.record.diagnosis, "Viêm họng mãn tính")

    def test_admin_can_update_record(self):
        self.auth(self.admin)
        res = self.client.patch(self.url, {"treatment_notes": "Cập nhật từ admin"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)

    def test_patient_cannot_update_record(self):
        """Bệnh nhân chỉ đọc — không được sửa hồ sơ."""
        self.auth(self.patient_user)
        res = self.client.patch(self.url, {"diagnosis": "Hack"}, format="json")
        self.assertEqual(res.status_code, 403)


class TestResultCreateTests(BaseAPITestCase):
    """POST /medical-records/{id}/add_test_result/ — Nhập kết quả cận lâm sàng."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.record  = _make_record(self.patient, self.doctor)
        self.url     = f"{MEDICAL_RECORDS_URL}{self.record.id}/add_test_result/"

    def _payload(self, test_type="blood"):
        return {
            "test_type": test_type,
            "test_name": "Công thức máu toàn bộ (CBC)",
            "test_date": str(date.today()),
            "status":    "ordered",
        }

    def test_doctor_can_add_test_result(self):
        self.auth(self.doctor_user)
        res = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["test_type"], "blood")

    def test_patient_cannot_add_test_result(self):
        """Bệnh nhân không thể nhập kết quả cận lâm sàng."""
        self.auth(self.patient_user)
        res = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_add(self):
        res = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(res.status_code, 401)

    def test_all_test_types_accepted(self):
        """Kiểm tra các loại CLS được chấp nhận."""
        valid_types = ["blood", "urine", "stool", "micro", "xray", "ct", "mri",
                       "ultrasound", "endoscopy", "ecg", "other"]
        self.auth(self.doctor_user)
        for t in valid_types:
            payload = self._payload(test_type=t)
            payload["test_name"] = f"Test {t}"
            res = self.client.post(self.url, payload, format="json")
            self.assertEqual(res.status_code, 201, f"Loại {t} bị từ chối: {res.data}")


class TestResultListTests(BaseAPITestCase):
    """GET /test-results/ — Xem kết quả cận lâm sàng."""

    def setUp(self):
        super().setUp()
        self.doctor   = Doctor.objects.get(user=self.doctor_user)
        self.patient  = Patient.objects.get(user=self.patient_user)
        self.patient2_user = make_patient_user("patient2_tr@test.com")
        self.patient2 = Patient.objects.get(user=self.patient2_user)
        self.doctor2_user  = make_doctor_user("doctor2_tr@test.com")
        self.doctor2  = Doctor.objects.get(user=self.doctor2_user)

        self.record1 = _make_record(self.patient, self.doctor)
        self.record2 = _make_record(self.patient2, self.doctor2)

        self.tr1 = TestResult.objects.create(
            medical_record=self.record1,
            test_type="blood",
            test_name="CBC",
            test_date=date.today(),
            status="ordered",
        )
        self.tr2 = TestResult.objects.create(
            medical_record=self.record2,
            test_type="urine",
            test_name="Tổng phân tích nước tiểu",
            test_date=date.today(),
            status="completed",
        )

    def test_patient_only_sees_own_test_results(self):
        self.auth(self.patient_user)
        res = self.client.get(TEST_RESULTS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [r["id"] for r in results]
        self.assertIn(self.tr1.id, ids)
        self.assertNotIn(self.tr2.id, ids)

    def test_doctor_sees_own_patients_results(self):
        self.auth(self.doctor_user)
        res = self.client.get(TEST_RESULTS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [r["id"] for r in results]
        self.assertIn(self.tr1.id, ids)
        self.assertNotIn(self.tr2.id, ids)

    def test_admin_sees_all_test_results(self):
        self.auth(self.admin)
        res = self.client.get(TEST_RESULTS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [r["id"] for r in results]
        self.assertIn(self.tr1.id, ids)
        self.assertIn(self.tr2.id, ids)

    def test_filter_by_status_ordered(self):
        self.auth(self.admin)
        res = self.client.get(TEST_RESULTS_URL, {"status": "ordered"})
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        for r in results:
            self.assertEqual(r["status"], "ordered")

    def test_filter_by_status_completed(self):
        self.auth(self.admin)
        res = self.client.get(TEST_RESULTS_URL, {"status": "completed"})
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        for r in results:
            self.assertEqual(r["status"], "completed")

    def test_unauthenticated_cannot_list_test_results(self):
        res = self.client.get(TEST_RESULTS_URL)
        self.assertEqual(res.status_code, 401)


class TestResultUpdateTests(BaseAPITestCase):
    """PATCH /test-results/{id}/ — Cập nhật / nhập kết quả."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        self.record  = _make_record(self.patient, self.doctor)
        self.tr      = TestResult.objects.create(
            medical_record=self.record,
            test_type="blood",
            test_name="CBC",
            test_date=date.today(),
            status="ordered",
        )
        self.url = f"{TEST_RESULTS_URL}{self.tr.id}/"

    def test_doctor_can_update_result(self):
        self.auth(self.doctor_user)
        res = self.client.patch(self.url, {
            "result": "Hb: 14.2 g/dL — bình thường",
            "status": "completed",
        }, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.tr.refresh_from_db()
        self.assertEqual(self.tr.status, "completed")

    def test_patient_cannot_update_result(self):
        """Bệnh nhân không thể sửa kết quả cận lâm sàng."""
        self.auth(self.patient_user)
        res = self.client.patch(self.url, {"result": "Hack"}, format="json")
        self.assertEqual(res.status_code, 403)
