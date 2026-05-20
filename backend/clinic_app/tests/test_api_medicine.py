"""
test_api_medicine.py — Kiểm thử API Thuốc & Kho (Medicine / Inventory).

Chạy: python manage.py test clinic_app.tests.test_api_medicine

BUG ĐÃ SỬA:
  1. InventoryTests và InventoryAlertTests tạo make_user(role="staff")
     → role không hợp lệ sau migration 0003. Fix: xóa staff tests, thay bằng admin.
  2. test_staff_can_add_inventory() → đổi thành test_admin_can_add_inventory()
  3. test_staff_can_list_alerts() → đổi thành test_admin_can_list_alerts()
  4. test_patient_cannot_view_low_stock() assertIn([403, 200]) → test quá lỏng lẻo,
     không verify security thực sự. Fix: assert cụ thể 200 (IsAuthenticatedWithValidToken)
  5. Scope mặc định trong auth() đã được fix ở base_test → tự map đúng per role.

Luồng được test:
  ✓ Mọi user đã đăng nhập đều xem được danh sách thuốc
  ✓ Chỉ Admin mới tạo/sửa/xóa thuốc
  ✓ Admin nhập kho (staff đã bị loại)
  ✓ Endpoint low_stock trả về thuốc sắp hết
  ✓ Endpoint near_expiry trả về thuốc sắp hết hạn
  ✓ Alert: chỉ admin mới list và resolve cảnh báo
"""

from datetime import date, timedelta

from clinic_app.models import MedicineCategory, Medicine, Inventory, InventoryAlert

from .base_test import BaseAPITestCase, make_user


MEDICINES_URL = "/medicines/"
INVENTORY_URL = "/inventory/"
ALERTS_URL = "/inventory-alerts/"


def make_category(name="Kháng sinh"):
    cat, _ = MedicineCategory.objects.get_or_create(name=name)
    return cat


def make_medicine(name="Amoxicillin", code="AMX001", category=None):
    if category is None:
        category = make_category()
    med, _ = Medicine.objects.get_or_create(
        code=code,
        defaults={
            "name": name,
            "category": category,
            "unit": "viên",
            "price": 5000,
            "requires_prescription": True,
            "is_active": True,
        },
    )
    return med


def make_inventory(medicine=None, quantity=50, expiry_days=60, threshold=10):
    if medicine is None:
        medicine = make_medicine()
    inv, _ = Inventory.objects.get_or_create(
        medicine=medicine,
        batch_number="BATCH-001",
        defaults={
            "quantity": quantity,
            "expiry_date": date.today() + timedelta(days=expiry_days),
            "import_price": 3000,
            "warning_threshold": threshold,
        },
    )
    return inv


class MedicineListTests(BaseAPITestCase):
    """GET /api/medicines/ — Danh sách thuốc."""

    def setUp(self):
        super().setUp()
        self.medicine = make_medicine()

    def test_patient_can_view_medicines(self):
        self.auth(self.patient_user)
        res = self.client.get(MEDICINES_URL)
        self.assertEqual(res.status_code, 200)

    def test_doctor_can_view_medicines(self):
        self.auth(self.doctor_user)
        res = self.client.get(MEDICINES_URL)
        self.assertEqual(res.status_code, 200)

    def test_admin_can_view_medicines(self):
        self.auth(self.admin)
        res = self.client.get(MEDICINES_URL)
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_cannot_view(self):
        res = self.client.get(MEDICINES_URL)
        self.assertEqual(res.status_code, 401)

    def test_search_by_name(self):
        self.auth(self.admin)
        res = self.client.get(MEDICINES_URL, {"search": "Amoxicillin"})
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        self.assertGreaterEqual(len(results), 1)


class MedicineCreateTests(BaseAPITestCase):
    """POST /api/medicines/ — Tạo thuốc (chỉ Admin)."""

    def _payload(self):
        cat = make_category("Vitamin")
        return {
            "category": cat.id,
            "name": "Vitamin C",
            "code": "VTC001",
            "unit": "viên",
            "price": 2000,
            "requires_prescription": False,
        }

    def test_admin_can_create_medicine(self):
        self.auth(self.admin)
        res = self.client.post(MEDICINES_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["name"], "Vitamin C")

    def test_patient_cannot_create_medicine(self):
        self.auth(self.patient_user)
        res = self.client.post(MEDICINES_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_doctor_cannot_create_medicine(self):
        self.auth(self.doctor_user)
        res = self.client.post(MEDICINES_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_create(self):
        res = self.client.post(MEDICINES_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 401)


class InventoryTests(BaseAPITestCase):
    """
    POST /api/inventory/ — Nhập kho.

    BUG FIX: staff đã bị loại → chỉ Admin mới nhập kho.
    Trước: tạo user role="staff" (invalid), test_staff_can_add_inventory().
    Nay:   chỉ Admin, test patient/doctor bị từ chối.
    """

    def setUp(self):
        super().setUp()
        self.medicine = make_medicine()

    def _payload(self):
        return {
            "medicine": self.medicine.id,
            "batch_number": "BATCH-NEW-001",
            "quantity": 100,
            "expiry_date": str(date.today() + timedelta(days=365)),
            "import_price": 3000,
            "supplier": "Công ty Dược ABC",
            "warning_threshold": 10,
        }

    def test_admin_can_add_inventory(self):
        """BUG FIX: trước là test_staff_can_add_inventory → staff không còn tồn tại."""
        self.auth(self.admin)
        res = self.client.post(INVENTORY_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)

    def test_patient_cannot_add_inventory(self):
        self.auth(self.patient_user)
        res = self.client.post(INVENTORY_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_doctor_cannot_add_inventory(self):
        self.auth(self.doctor_user)
        res = self.client.post(INVENTORY_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_add_inventory(self):
        res = self.client.post(INVENTORY_URL, self._payload(), format="json")
        self.assertEqual(res.status_code, 401)

    def test_all_auth_users_can_view_inventory(self):
        """GET inventory là read-only cho mọi user đã đăng nhập."""
        self.auth(self.patient_user)
        res = self.client.get(INVENTORY_URL)
        self.assertEqual(res.status_code, 200)


class LowStockTests(BaseAPITestCase):
    """GET /api/inventory/low_stock/ — Thuốc sắp hết."""

    def setUp(self):
        super().setUp()
        med = make_medicine(code="LOW001")
        make_inventory(medicine=med, quantity=3, threshold=10)  # 3 <= 10 → low

    def test_low_stock_returns_correct_items(self):
        self.auth(self.admin)
        res = self.client.get(f"{INVENTORY_URL}low_stock/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

    def test_authenticated_patient_can_view_low_stock(self):
        """
        BUG FIX: test cũ assertIn([403, 200]) → quá lỏng lẻo.
        InventoryViewSet GET dùng IsAuthenticatedWithValidToken → patient được xem.
        """
        self.auth(self.patient_user)
        res = self.client.get(f"{INVENTORY_URL}low_stock/")
        self.assertEqual(res.status_code, 200)  # read action → any auth

    def test_unauthenticated_cannot_view_low_stock(self):
        res = self.client.get(f"{INVENTORY_URL}low_stock/")
        self.assertEqual(res.status_code, 401)


class NearExpiryTests(BaseAPITestCase):
    """GET /api/inventory/near_expiry/ — Thuốc sắp hết hạn."""

    def setUp(self):
        super().setUp()
        med = make_medicine(code="EXP001")
        make_inventory(medicine=med, expiry_days=15)  # hết hạn trong 15 ngày → near expiry

    def test_near_expiry_returns_items(self):
        self.auth(self.admin)
        res = self.client.get(f"{INVENTORY_URL}near_expiry/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

    def test_doctor_can_view_near_expiry(self):
        self.auth(self.doctor_user)
        res = self.client.get(f"{INVENTORY_URL}near_expiry/")
        self.assertEqual(res.status_code, 200)


class InventoryAlertTests(BaseAPITestCase):
    """
    GET  /api/inventory-alerts/              — Danh sách cảnh báo [admin only]
    PATCH /api/inventory-alerts/{id}/resolve/ — Xử lý cảnh báo   [admin only]

    BUG FIX: staff_user đã bị loại → dùng admin user.
    """

    def setUp(self):
        super().setUp()
        med = make_medicine(code="ALERT001")
        inv = make_inventory(medicine=med)
        self.alert = InventoryAlert.objects.create(
            medicine=med,
            inventory=inv,
            alert_type="low_stock",
            message="Thuốc sắp hết hàng",
        )

    def test_admin_can_list_alerts(self):
        """BUG FIX: trước là test_staff_can_list_alerts."""
        self.auth(self.admin)
        res = self.client.get(ALERTS_URL)
        self.assertEqual(res.status_code, 200)

    def test_admin_can_resolve_alert(self):
        """BUG FIX: trước là test_resolve_alert với staff_user."""
        self.auth(self.admin)
        res = self.client.patch(f"{ALERTS_URL}{self.alert.id}/resolve/")
        self.assertEqual(res.status_code, 200, res.data)
        self.alert.refresh_from_db()
        self.assertTrue(self.alert.is_resolved)

    def test_patient_cannot_list_alerts(self):
        self.auth(self.patient_user)
        res = self.client.get(ALERTS_URL)
        self.assertEqual(res.status_code, 403)

    def test_doctor_cannot_list_alerts(self):
        self.auth(self.doctor_user)
        res = self.client.get(ALERTS_URL)
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_cannot_list_alerts(self):
        res = self.client.get(ALERTS_URL)
        self.assertEqual(res.status_code, 401)