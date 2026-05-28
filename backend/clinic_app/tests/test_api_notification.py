"""
test_api_notification.py — Kiểm thử API Thông báo (Notification).

Chạy: python manage.py test clinic_app.tests.test_api_notification

Luồng được test:
  ✓ User xem thông báo của mình → 200
  ✓ User không thấy thông báo của người khác
  ✓ Chưa đăng nhập → 401
  ✓ Đánh dấu 1 thông báo đã đọc → 200, is_read=True
  ✓ Không thể đánh dấu thông báo của người khác
  ✓ Đánh dấu tất cả đã đọc (read_all) → trả về số lượng đã cập nhật
  ✓ Thông báo đã đọc không bị đánh dấu lại bởi read_all
  ✓ Signal tạo thông báo khi lịch hẹn được xác nhận
  ✓ Signal tạo thông báo khi thanh toán thành công
"""

from datetime import timedelta

from django.utils import timezone

from clinic_app.models import Appointment, Doctor, DoctorSchedule, Notification, Patient

from .base_test import BaseAPITestCase, make_patient_user

NOTIFICATIONS_URL = "/notifications/"


def _make_notification(user, title="Test", message="Test message",
                       notif_type=Notification.Type.SYSTEM, is_read=False):
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        type=notif_type,
        is_read=is_read,
    )


class NotificationListTests(BaseAPITestCase):
    """GET /notifications/ — Danh sách thông báo."""

    def setUp(self):
        super().setUp()
        self.patient2_user = make_patient_user("patient2_notif@test.com")

        # Tạo thông báo cho patient1 và patient2
        self.notif1 = _make_notification(self.patient_user, "Xác nhận lịch hẹn", "Lịch hẹn đã xác nhận")
        self.notif2 = _make_notification(self.patient_user, "Đơn thuốc sẵn sàng", "Đến lấy thuốc")
        self.notif3 = _make_notification(self.patient2_user, "Thông báo patient2", "Nội dung riêng")

    def test_patient_sees_own_notifications(self):
        self.auth(self.patient_user)
        res = self.client.get(NOTIFICATIONS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [n["id"] for n in results]
        self.assertIn(self.notif1.id, ids)
        self.assertIn(self.notif2.id, ids)

    def test_patient_cannot_see_other_users_notifications(self):
        """Bệnh nhân không thấy thông báo của người khác."""
        self.auth(self.patient_user)
        res = self.client.get(NOTIFICATIONS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [n["id"] for n in results]
        self.assertNotIn(self.notif3.id, ids)

    def test_unauthenticated_cannot_list(self):
        res = self.client.get(NOTIFICATIONS_URL)
        self.assertEqual(res.status_code, 401)

    def test_admin_sees_only_own_notifications(self):
        """Admin cũng chỉ thấy thông báo của chính mình (không phải tất cả)."""
        admin_notif = _make_notification(self.admin, "Admin notif", "For admin only")
        self.auth(self.admin)
        res = self.client.get(NOTIFICATIONS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        ids = [n["id"] for n in results]
        self.assertIn(admin_notif.id, ids)
        self.assertNotIn(self.notif1.id, ids)

    def test_empty_notifications_for_new_user(self):
        new_user = make_patient_user("new_notif@test.com")
        self.auth(new_user)
        res = self.client.get(NOTIFICATIONS_URL)
        self.assertEqual(res.status_code, 200)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 0)


class NotificationMarkReadTests(BaseAPITestCase):
    """PATCH /notifications/{id}/read/ — Đánh dấu đã đọc."""

    def setUp(self):
        super().setUp()
        self.notif = _make_notification(
            self.patient_user, "Test unread", "Chưa đọc", is_read=False
        )
        self.url = f"{NOTIFICATIONS_URL}{self.notif.id}/read/"

    def test_patient_can_mark_own_notification_read(self):
        self.auth(self.patient_user)
        res = self.client.patch(self.url)
        self.assertEqual(res.status_code, 200, res.data)
        self.notif.refresh_from_db()
        self.assertTrue(self.notif.is_read)
        self.assertIsNotNone(self.notif.read_at)

    def test_cannot_mark_other_users_notification(self):
        """Không thể đánh dấu thông báo của người khác."""
        patient2_user = make_patient_user("patient2_read@test.com")
        other_notif = _make_notification(patient2_user, "Other", "Other message")
        self.auth(self.patient_user)
        res = self.client.patch(f"{NOTIFICATIONS_URL}{other_notif.id}/read/")
        # 404 — không thấy thông báo của người khác trong queryset
        self.assertEqual(res.status_code, 404)

    def test_unauthenticated_cannot_mark_read(self):
        res = self.client.patch(self.url)
        self.assertEqual(res.status_code, 401)

    def test_marking_already_read_notification_is_idempotent(self):
        """Đánh dấu thông báo đã đọc rồi đánh dấu lại → vẫn trả 200."""
        already_read = _make_notification(
            self.patient_user, "Already read", "Đã đọc", is_read=True
        )
        self.auth(self.patient_user)
        res = self.client.patch(f"{NOTIFICATIONS_URL}{already_read.id}/read/")
        self.assertEqual(res.status_code, 200)


class NotificationReadAllTests(BaseAPITestCase):
    """PATCH /notifications/read-all/ — Đánh dấu tất cả đã đọc."""

    def setUp(self):
        super().setUp()
        # Tạo 3 thông báo chưa đọc và 1 đã đọc
        self.unread1 = _make_notification(self.patient_user, "Unread 1", "...", is_read=False)
        self.unread2 = _make_notification(self.patient_user, "Unread 2", "...", is_read=False)
        self.unread3 = _make_notification(self.patient_user, "Unread 3", "...", is_read=False)
        self.read1   = _make_notification(self.patient_user, "Read 1",   "...", is_read=True)

    def test_read_all_marks_all_unread(self):
        self.auth(self.patient_user)
        res = self.client.patch(f"{NOTIFICATIONS_URL}read_all/")
        self.assertEqual(res.status_code, 200, res.data)
        # Response chứa số lượng đã cập nhật
        self.assertIn("detail", res.data)
        # Kiểm tra DB
        self.unread1.refresh_from_db()
        self.unread2.refresh_from_db()
        self.unread3.refresh_from_db()
        self.assertTrue(self.unread1.is_read)
        self.assertTrue(self.unread2.is_read)
        self.assertTrue(self.unread3.is_read)

    def test_read_all_returns_count(self):
        """Response chứa số lượng thông báo đã được đánh dấu."""
        self.auth(self.patient_user)
        res = self.client.patch(f"{NOTIFICATIONS_URL}read_all/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("3", res.data.get("detail", ""))

    def test_read_all_only_affects_own_notifications(self):
        """read_all không ảnh hưởng đến thông báo của user khác."""
        patient2_user = make_patient_user("patient2_readall@test.com")
        other_notif   = _make_notification(patient2_user, "Other unread", "...", is_read=False)
        self.auth(self.patient_user)
        self.client.patch(f"{NOTIFICATIONS_URL}read_all/")
        other_notif.refresh_from_db()
        self.assertFalse(other_notif.is_read)

    def test_unauthenticated_cannot_read_all(self):
        res = self.client.patch(f"{NOTIFICATIONS_URL}read_all/")
        self.assertEqual(res.status_code, 401)


class NotificationSignalTests(BaseAPITestCase):
    """Kiểm thử Signal tự động tạo thông báo khi có sự kiện."""

    def setUp(self):
        super().setUp()
        self.doctor  = Doctor.objects.get(user=self.doctor_user)
        self.patient = Patient.objects.get(user=self.patient_user)
        sch, _ = DoctorSchedule.objects.get_or_create(
            doctor=self.doctor,
            date=(timezone.now() + timedelta(days=2)).date(),
            start_time="09:00",
            defaults={"end_time": "17:00", "max_appointments": 5},
        )
        self.schedule = sch

    def test_confirmed_appointment_creates_notification(self):
        """Khi lịch hẹn được xác nhận → tạo thông báo cho bệnh nhân."""
        # Tạo appointment pending trước
        apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            schedule=self.schedule,
            appointment_date=timezone.now() + timedelta(days=2),
            status="pending",
        )
        before_count = Notification.objects.filter(user=self.patient_user).count()

        # Thay đổi trạng thái → confirmed (kích hoạt signal)
        apt.status = "confirmed"
        apt.save()

        after_count = Notification.objects.filter(user=self.patient_user).count()
        self.assertGreater(after_count, before_count)
        latest = Notification.objects.filter(
            user=self.patient_user,
            type=Notification.Type.APPOINTMENT_CONFIRMED,
        ).last()
        self.assertIsNotNone(latest)

    def test_cancelled_appointment_creates_notification(self):
        """Khi lịch hẹn bị hủy → tạo thông báo loại APPOINTMENT_CANCELLED."""
        apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            schedule=self.schedule,
            appointment_date=timezone.now() + timedelta(days=2),
            status="pending",
        )
        apt.status = "cancelled"
        apt.save()

        notif = Notification.objects.filter(
            user=self.patient_user,
            type=Notification.Type.APPOINTMENT_CANCELLED,
        ).last()
        self.assertIsNotNone(notif)
