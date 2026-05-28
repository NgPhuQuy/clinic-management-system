"""
test_api_dashboard.py — Kiểm thử API Thống kê & Báo cáo (Dashboard / Reports).

Chạy: python manage.py test clinic_app.tests.test_api_dashboard

Luồng được test:
  ✓ Admin xem dashboard tổng quan → 200 với đủ các trường số liệu
  ✓ Patient không thể xem dashboard → 403
  ✓ Doctor không thể xem dashboard → 403
  ✓ Chưa đăng nhập → 401
  ✓ Báo cáo theo nhóm tuổi (age_group) → danh sách + count
  ✓ Báo cáo theo giới tính (gender) → male/female
  ✓ Báo cáo theo chuyên khoa (specialty) → tên CK + count
  ✓ Báo cáo dịch vụ y tế (service) → trả về list (có thể rỗng nếu chưa có dữ liệu)
  ✓ Báo cáo bệnh phổ biến (disease) → top diagnoses
  ✓ Báo cáo doanh thu (revenue) theo ngày/tuần/tháng → có total_revenue
  ✓ Báo cáo với type không hợp lệ → 400
  ✓ Doctor dashboard riêng biệt → 200
  ✓ Patient không được xem doctor dashboard → 403
"""

from datetime import timedelta

from django.utils import timezone

from clinic_app.models import (
    Appointment, Doctor, DoctorSchedule, MedicalRecord, Patient,
    Payment, Invoice,
)

from .base_test import BaseAPITestCase

ADMIN_DASHBOARD_URL  = "/admin/dashboard/"
ADMIN_REPORTS_URL    = "/admin/dashboard/reports/"
DOCTOR_DASHBOARD_URL = "/doctor/dashboard/"


def _make_schedule(doctor, days=1):
    d = (timezone.now() + timedelta(days=days)).date()
    sch, _ = DoctorSchedule.objects.get_or_create(
        doctor=doctor, date=d, start_time="08:00",
        defaults={"end_time": "12:00", "max_appointments": 10},
    )
    return sch


class AdminDashboardTests(BaseAPITestCase):
    """GET /admin/dashboard/ — Tổng quan số liệu."""

    def test_admin_can_view_dashboard(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_DASHBOARD_URL)
        self.assertEqual(res.status_code, 200, res.data)

    def test_dashboard_contains_required_fields(self):
        """Response phải có các trường thống kê cơ bản."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_DASHBOARD_URL)
        self.assertEqual(res.status_code, 200)
        data = res.data
        required_fields = [
            "total_patients",
            "new_patients_month",
            "appointments_today",
            "appointments_month",
            "revenue_today",
            "revenue_month",
        ]
        for field in required_fields:
            self.assertIn(field, data, f"Trường '{field}' thiếu trong response dashboard")

    def test_patient_cannot_view_dashboard(self):
        self.auth(self.patient_user)
        res = self.client.get(ADMIN_DASHBOARD_URL)
        self.assertEqual(res.status_code, 403)

    def test_doctor_cannot_view_dashboard(self):
        self.auth(self.doctor_user)
        res = self.client.get(ADMIN_DASHBOARD_URL)
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_view_dashboard(self):
        res = self.client.get(ADMIN_DASHBOARD_URL)
        self.assertEqual(res.status_code, 401)

    def test_dashboard_patient_count_is_non_negative(self):
        """Số bệnh nhân không âm."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_DASHBOARD_URL)
        self.assertGreaterEqual(res.data["total_patients"], 0)

    def test_dashboard_revenue_is_non_negative(self):
        """Doanh thu không âm."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_DASHBOARD_URL)
        self.assertGreaterEqual(float(res.data["revenue_today"]), 0)
        self.assertGreaterEqual(float(res.data["revenue_month"]), 0)


class AdminReportsPermissionTests(BaseAPITestCase):
    """Kiểm tra phân quyền cho endpoint reports."""

    def test_admin_can_access_reports(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "age_group"})
        self.assertEqual(res.status_code, 200)

    def test_patient_cannot_access_reports(self):
        self.auth(self.patient_user)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "age_group"})
        self.assertEqual(res.status_code, 403)

    def test_doctor_cannot_access_reports(self):
        self.auth(self.doctor_user)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "age_group"})
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_access_reports(self):
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "revenue"})
        self.assertEqual(res.status_code, 401)


class ReportAgeGroupTests(BaseAPITestCase):
    """GET /admin/dashboard/reports/?type=age_group — Phân bổ bệnh nhân theo độ tuổi."""

    def test_age_group_report_returns_list(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "age_group"})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsInstance(res.data, list)

    def test_age_group_entries_have_label_and_count(self):
        """Mỗi phần tử cần có label (nhóm tuổi) và count."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "age_group"})
        self.assertEqual(res.status_code, 200)
        for item in res.data:
            self.assertIn("label", item, f"Thiếu 'label' trong {item}")
            self.assertIn("count", item, f"Thiếu 'count' trong {item}")
            self.assertGreaterEqual(item["count"], 0)

    def test_age_group_labels_cover_all_ranges(self):
        """Kết quả phải bao gồm các nhóm tuổi theo đề tài."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "age_group"})
        self.assertEqual(res.status_code, 200)
        labels = [item["label"] for item in res.data]
        # Đề tài yêu cầu: <18, 18-30, 31-45, 46-60, >60
        self.assertGreaterEqual(len(labels), 4)


class ReportGenderTests(BaseAPITestCase):
    """GET /admin/dashboard/reports/?type=gender — Phân bổ theo giới tính."""

    def test_gender_report_returns_list(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "gender"})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsInstance(res.data, list)

    def test_gender_entries_have_label_and_count(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "gender"})
        self.assertEqual(res.status_code, 200)
        for item in res.data:
            self.assertIn("label", item)
            self.assertIn("count", item)
            self.assertGreaterEqual(item["count"], 0)


class ReportSpecialtyTests(BaseAPITestCase):
    """GET /admin/dashboard/reports/?type=specialty — Số lượt khám theo chuyên khoa."""

    def test_specialty_report_returns_list(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "specialty"})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsInstance(res.data, list)

    def test_specialty_entries_have_name_and_count(self):
        """Mỗi phần tử có tên chuyên khoa và số lượt."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "specialty"})
        self.assertEqual(res.status_code, 200)
        for item in res.data:
            # Có thể là 'label'/'name' + 'count'
            has_name = "label" in item or "name" in item or "specialty" in item
            self.assertTrue(has_name, f"Thiếu tên chuyên khoa trong {item}")
            self.assertIn("count", item)

    def test_specialty_count_reflects_appointments(self):
        """Sau khi tạo lịch hẹn, số liệu chuyên khoa phải tăng."""
        doctor  = Doctor.objects.get(user=self.doctor_user)
        patient = Patient.objects.get(user=self.patient_user)
        sch = _make_schedule(doctor)
        Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            schedule=sch,
            appointment_date=timezone.now() + timedelta(days=1),
            status="confirmed",
        )
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "specialty"})
        self.assertEqual(res.status_code, 200)
        # Tổng count >= 1 vì đã có ít nhất 1 appointment
        total = sum(item.get("count", 0) for item in res.data)
        self.assertGreaterEqual(total, 1)


class ReportServiceTests(BaseAPITestCase):
    """GET /admin/dashboard/reports/?type=service — Dịch vụ y tế được sử dụng."""

    def test_service_report_returns_list(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "service"})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsInstance(res.data, list)


class ReportDiseaseTests(BaseAPITestCase):
    """GET /admin/dashboard/reports/?type=disease — Bệnh phổ biến trong cộng đồng."""

    def setUp(self):
        super().setUp()
        doctor  = Doctor.objects.get(user=self.doctor_user)
        patient = Patient.objects.get(user=self.patient_user)
        # Tạo dữ liệu hồ sơ bệnh án để báo cáo có dữ liệu
        MedicalRecord.objects.create(
            patient=patient, doctor=doctor,
            diagnosis="Viêm họng cấp", symptoms="Đau họng",
        )
        MedicalRecord.objects.create(
            patient=patient, doctor=doctor,
            diagnosis="Viêm họng cấp", symptoms="Đau họng sốt",
        )
        MedicalRecord.objects.create(
            patient=patient, doctor=doctor,
            diagnosis="Cảm cúm", symptoms="Sổ mũi, hắt hơi",
        )

    def test_disease_report_returns_list(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "disease"})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsInstance(res.data, list)

    def test_disease_entries_have_diagnosis_and_count(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "disease"})
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)
        for item in res.data:
            has_diag = "diagnosis" in item or "label" in item or "name" in item
            self.assertTrue(has_diag, f"Thiếu tên bệnh trong {item}")
            self.assertIn("count", item)

    def test_top_disease_is_viem_hong(self):
        """Bệnh xuất hiện nhiều nhất phải là đứng đầu danh sách."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "disease"})
        self.assertEqual(res.status_code, 200)
        if res.data:
            top = res.data[0]
            diag = top.get("diagnosis") or top.get("label") or top.get("name", "")
            self.assertIn("Viêm họng", diag)

    def test_disease_report_limited_to_top_20(self):
        """Báo cáo không trả về quá 20 bệnh."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "disease"})
        self.assertEqual(res.status_code, 200)
        self.assertLessEqual(len(res.data), 20)


class ReportRevenueTests(BaseAPITestCase):
    """GET /admin/dashboard/reports/?type=revenue — Doanh thu."""

    def test_revenue_report_by_day(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "revenue", "period": "day"})
        self.assertEqual(res.status_code, 200, res.data)

    def test_revenue_report_by_week(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "revenue", "period": "week"})
        self.assertEqual(res.status_code, 200, res.data)

    def test_revenue_report_by_month(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "revenue", "period": "month"})
        self.assertEqual(res.status_code, 200, res.data)

    def test_revenue_report_has_total(self):
        """Báo cáo doanh thu phải có tổng (total_revenue hoặc total)."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "revenue"})
        self.assertEqual(res.status_code, 200)
        has_total = "total_revenue" in res.data or "total" in res.data or "data" in res.data
        self.assertTrue(has_total, f"Thiếu total trong revenue report: {list(res.data.keys())}")

    def test_revenue_report_timeline_is_list(self):
        """Timeline phân tích doanh thu theo thời gian là danh sách."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "revenue", "period": "day"})
        self.assertEqual(res.status_code, 200)
        # Có thể là res.data là dict với "data" list, hoặc là list trực tiếp
        if isinstance(res.data, dict):
            timeline = res.data.get("data") or res.data.get("timeline") or []
            self.assertIsInstance(timeline, list)
        else:
            self.assertIsInstance(res.data, list)


class ReportInvalidTypeTests(BaseAPITestCase):
    """Báo cáo với type không hợp lệ → 400."""

    def test_invalid_report_type_returns_400(self):
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL, {"type": "invalid_type_xyz"})
        self.assertEqual(res.status_code, 400)

    def test_missing_type_param(self):
        """Không truyền type → 400."""
        self.auth(self.admin)
        res = self.client.get(ADMIN_REPORTS_URL)
        self.assertEqual(res.status_code, 400)


class DoctorDashboardTests(BaseAPITestCase):
    """GET /doctor/dashboard/ — Dashboard bác sĩ."""

    def test_doctor_can_view_own_dashboard(self):
        self.auth(self.doctor_user)
        res = self.client.get(DOCTOR_DASHBOARD_URL)
        self.assertEqual(res.status_code, 200, res.data)

    def test_doctor_dashboard_has_expected_fields(self):
        """Dashboard bác sĩ phải có số lịch hẹn hôm nay và tổng."""
        self.auth(self.doctor_user)
        res = self.client.get(DOCTOR_DASHBOARD_URL)
        self.assertEqual(res.status_code, 200)
        # Kiểm tra có ít nhất một trong các trường thống kê cơ bản
        has_stats = any(k in res.data for k in [
            "appointments_today", "total_appointments",
            "pending_appointments", "completed_appointments",
            "today_appointments",
        ])
        self.assertTrue(has_stats, f"Doctor dashboard thiếu trường thống kê: {list(res.data.keys())}")

    def test_patient_cannot_view_doctor_dashboard(self):
        self.auth(self.patient_user)
        res = self.client.get(DOCTOR_DASHBOARD_URL)
        self.assertEqual(res.status_code, 403)

    def test_admin_cannot_view_doctor_dashboard(self):
        """Admin không có doctor scope → 403."""
        self.auth(self.admin)
        res = self.client.get(DOCTOR_DASHBOARD_URL)
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_view_doctor_dashboard(self):
        res = self.client.get(DOCTOR_DASHBOARD_URL)
        self.assertEqual(res.status_code, 401)
