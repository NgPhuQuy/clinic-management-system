from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# ─────────────────────────────────────────────
# Router — tự generate CRUD endpoints
# ─────────────────────────────────────────────
router = DefaultRouter()
router.register(r"specialties", views.SpecialtyViewSet, basename="specialty")
router.register(r"services", views.ServiceViewSet, basename="service")
router.register(r"patients", views.PatientViewSet, basename="patient")
router.register(r"doctors", views.DoctorViewSet, basename="doctor")
router.register(r"schedules", views.DoctorScheduleViewSet, basename="schedule")
router.register(r"appointments", views.AppointmentViewSet, basename="appointment")
router.register(r"medical-records", views.MedicalRecordViewSet, basename="medical-record")
router.register(r"medicine-categories", views.MedicineCategoryViewSet, basename="medicine-category")
router.register(r"medicines", views.MedicineViewSet, basename="medicine")
router.register(r"inventory", views.InventoryViewSet, basename="inventory")
router.register(r"inventory-alerts", views.InventoryAlertViewSet, basename="inventory-alert")
router.register(r"prescriptions", views.PrescriptionViewSet, basename="prescription")
router.register(r"payments", views.PaymentViewSet, basename="payment")
router.register(r"consultations", views.ConsultationViewSet, basename="consultation")
router.register(r"notifications", views.NotificationViewSet, basename="notification")

# ─────────────────────────────────────────────
# URL patterns
# ─────────────────────────────────────────────
urlpatterns = [

    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change_password"),

    # ── Admin Dashboard ───────────────────────
    path("admin/dashboard/", views.DashboardView.as_view(), name="dashboard"),

    # ── Router ────────────────────────────────
    path("", include(router.urls)),
]

# ─────────────────────────────────────────────
# API REFERENCE
# ─────────────────────────────────────────────
#
# AUTH
#   POST   /api/auth/register/              Đăng ký
#   POST   /api/auth/login/                 Đăng nhập → access + refresh token
#   POST   /api/auth/refresh/               Làm mới access token
#   POST   /api/auth/verify/                Xác minh token
#   GET    /api/auth/me/                    Thông tin user hiện tại
#   PUT    /api/auth/change-password/       Đổi mật khẩu
#
# SPECIALTY & SERVICE
#   GET    /api/specialties/                Danh sách chuyên khoa
#   GET    /api/services/?specialty={id}    Dịch vụ theo chuyên khoa
#
# PATIENT
#   GET    /api/patients/                   Danh sách (admin/staff)
#   GET    /api/patients/{id}/              Chi tiết bệnh nhân
#   PATCH  /api/patients/{id}/              Cập nhật profile
#   GET    /api/patients/{id}/appointments/ Lịch sử lịch hẹn
#   GET    /api/patients/{id}/medical_records/ Lịch sử bệnh án
#
# DOCTOR
#   GET    /api/doctors/                    Danh sách bác sĩ (public)
#   GET    /api/doctors/?specialty={id}     Lọc theo chuyên khoa
#   GET    /api/doctors/{id}/schedules/     Lịch trống của bác sĩ
#   GET    /api/doctors/{id}/appointments/  Lịch hẹn của bác sĩ
#
# SCHEDULE
#   POST   /api/schedules/                  Bác sĩ tạo ca làm việc
#   GET    /api/schedules/?doctor={id}&date=YYYY-MM-DD
#
# APPOINTMENT
#   POST   /api/appointments/               Đặt lịch hẹn
#   GET    /api/appointments/               Danh sách lịch hẹn
#   GET    /api/appointments/{id}/          Chi tiết
#   PATCH  /api/appointments/{id}/status/   Cập nhật trạng thái
#   POST   /api/appointments/{id}/add_service/  Thêm dịch vụ
#
# MEDICAL RECORD
#   POST   /api/medical-records/            Tạo hồ sơ bệnh án
#   GET    /api/medical-records/{id}/       Chi tiết
#   POST   /api/medical-records/{id}/add_test_result/  Thêm kết quả XN
#
# MEDICINE & INVENTORY
#   GET    /api/medicines/                  Danh sách thuốc
#   GET    /api/inventory/                  Xem tồn kho
#   POST   /api/inventory/                  Nhập kho
#   GET    /api/inventory/low_stock/        Thuốc sắp hết
#   GET    /api/inventory/near_expiry/      Thuốc sắp hết hạn
#   GET    /api/inventory-alerts/           Danh sách cảnh báo
#   PATCH  /api/inventory-alerts/{id}/resolve/  Đánh dấu đã xử lý
#
# PRESCRIPTION
#   POST   /api/prescriptions/              Kê đơn thuốc
#   GET    /api/prescriptions/{id}/         Chi tiết đơn thuốc
#   POST   /api/prescriptions/{id}/add_medicine/  Thêm thuốc vào đơn
#   POST   /api/prescriptions/{id}/dispense/      Cấp phát (trừ kho)
#
# PAYMENT
#   POST   /api/payments/init/              Khởi tạo thanh toán
#   GET    /api/payments/                   Lịch sử thanh toán
#   POST   /api/payments/{id}/confirm/      Xác nhận thanh toán
#
# CONSULTATION
#   GET    /api/consultations/{id}/         Chi tiết phòng tư vấn
#   POST   /api/consultations/{id}/start/   Mở phòng
#   POST   /api/consultations/{id}/end/     Đóng phòng
#   POST   /api/consultations/{id}/message/ Gửi tin nhắn
#
# NOTIFICATION
#   GET    /api/notifications/              Thông báo của tôi
#   PATCH  /api/notifications/{id}/read/    Đánh dấu đã đọc
#   POST   /api/notifications/read-all/     Đánh dấu tất cả đã đọc
#
# ADMIN
#   GET    /api/admin/dashboard/            Thống kê tổng hợp
