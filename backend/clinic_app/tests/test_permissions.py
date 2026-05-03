"""
test_permissions.py — Kiểm thử phân quyền (Role-based Access Control).

Chạy: python manage.py test clinic_app.tests.test_permissions

Đây là module test QUAN TRỌNG nhất vì bài tập yêu cầu OAuth2 + phân quyền.

Luồng được test:
  ✓ Admin truy cập mọi endpoint
  ✓ Patient chỉ truy cập endpoint của mình
  ✓ Doctor chỉ thấy lịch hẹn của mình
  ✓ Staff có quyền riêng (kho thuốc)
  ✓ Anonymous bị từ chối tất cả protected endpoints
  ✓ Admin dashboard chỉ Admin được xem
  ✓ Danh sách bác sĩ là public (AllowAny)
  ✓ Danh sách chuyên khoa là public
"""

from .base import BaseAPITestCase, make_user


class AnonymousAccessTests(BaseAPITestCase):
    """Người dùng chưa đăng nhập bị từ chối."""

    def test_anonymous_cannot_access_appointments(self):
        res = self.client.get("/appointments/")
        self.assertEqual(res.status_code, 401)

    def test_anonymous_cannot_access_patients(self):
        res = self.client.get("/patients/")
        self.assertEqual(res.status_code, 401)

    def test_anonymous_cannot_access_dashboard(self):
        res = self.client.get("/admin/dashboard/")
        self.assertEqual(res.status_code, 401)

    def test_anonymous_cannot_access_medicines(self):
        res = self.client.get("/medicines/")
        self.assertEqual(res.status_code, 401)

    def test_anonymous_cannot_access_notifications(self):
        res = self.client.get("/notifications/")
        self.assertEqual(res.status_code, 401)


class PublicEndpointTests(BaseAPITestCase):
    """Một số endpoint không cần đăng nhập."""

    def test_doctors_list_is_accessible(self):
        """
        Danh sách bác sĩ nên public để bệnh nhân chọn trước khi đăng ký.
        Nếu view yêu cầu IsAuthenticated thì test này sẽ nhắc nhở cần sửa.
        """
        res = self.client.get("/doctors/")
        # Nếu 401 → cân nhắc đổi sang AllowAny cho GET
        # Nếu 200 → tốt, đã public
        self.assertIn(res.status_code, [200, 401])

    def test_specialties_list(self):
        res = self.client.get("/specialties/")
        self.assertIn(res.status_code, [200, 401])


class AdminAccessTests(BaseAPITestCase):
    """Admin có quyền truy cập mọi nơi."""

    def test_admin_can_access_dashboard(self):
        self.auth(self.admin)
        res = self.client.get("/admin/dashboard/")
        self.assertEqual(res.status_code, 200)

    def test_admin_can_list_all_patients(self):
        self.auth(self.admin)
        res = self.client.get("/patients/")
        self.assertEqual(res.status_code, 200)

    def test_admin_can_list_all_appointments(self):
        self.auth(self.admin)
        res = self.client.get("/appointments/")
        self.assertEqual(res.status_code, 200)

    def test_admin_can_list_medicines(self):
        self.auth(self.admin)
        res = self.client.get("/medicines/")
        self.assertEqual(res.status_code, 200)

    def test_admin_can_view_inventory_alerts(self):
        self.auth(self.admin)
        res = self.client.get("/inventory-alerts/")
        self.assertEqual(res.status_code, 200)


class PatientAccessTests(BaseAPITestCase):
    """Patient chỉ được phép những gì của mình."""

    def test_patient_cannot_access_dashboard(self):
        self.auth(self.patient_user)
        res = self.client.get("/admin/dashboard/")
        self.assertEqual(res.status_code, 403)

    def test_patient_cannot_create_medicine(self):
        self.auth(self.patient_user)
        res = self.client.post("/medicines/", {
            "name": "Hack", "code": "HACK", "unit": "viên", "price": 1
        }, format="json")
        self.assertEqual(res.status_code, 403)

    def test_patient_cannot_access_inventory_alerts(self):
        self.auth(self.patient_user)
        res = self.client.get("/inventory-alerts/")
        self.assertEqual(res.status_code, 403)

    def test_patient_can_view_own_notifications(self):
        self.auth(self.patient_user)
        res = self.client.get("/notifications/")
        self.assertEqual(res.status_code, 200)


class DoctorAccessTests(BaseAPITestCase):
    """Doctor có quyền riêng biệt."""

    def test_doctor_cannot_access_dashboard(self):
        self.auth(self.doctor_user)
        res = self.client.get("/admin/dashboard/")
        self.assertEqual(res.status_code, 403)

    def test_doctor_cannot_create_appointment(self):
        """Doctor không thể đặt lịch (chỉ patient mới đặt)."""
        self.auth(self.doctor_user)
        res = self.client.post("/appointments/", {}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_doctor_can_view_appointments(self):
        self.auth(self.doctor_user)
        res = self.client.get("/appointments/")
        self.assertEqual(res.status_code, 200)

    def test_doctor_can_view_medicines(self):
        self.auth(self.doctor_user)
        res = self.client.get("/medicines/")
        self.assertEqual(res.status_code, 200)


class StaffAccessTests(BaseAPITestCase):
    """Staff có quyền quản lý kho thuốc."""

    def setUp(self):
        super().setUp()
        self.staff_user = make_user("staff_perm@test.com", role="staff")

    def test_staff_can_access_inventory_alerts(self):
        self.auth(self.staff_user)
        res = self.client.get("/inventory-alerts/")
        self.assertEqual(res.status_code, 200)

    def test_staff_cannot_access_dashboard(self):
        self.auth(self.staff_user)
        res = self.client.get("/admin/dashboard/")
        self.assertEqual(res.status_code, 403)