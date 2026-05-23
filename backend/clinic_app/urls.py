"""
clinic_app/urls.py  — PHIÊN BẢN MỞ RỘNG (thêm doctor + staff endpoints)

Thay thế file urls.py hiện tại bằng file này.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views.staff_doctor import (
    DoctorDashboardView,
    StaffDashboardView,
    StaffPatientListView,
    StaffPatientDetailView,
    StaffPaymentListView,
    DoctorMyScheduleView,
    DoctorTodayAppointmentsView,
    StaffInventoryAlertView,
)

router = DefaultRouter()
router.register(r"specialties",         views.SpecialtyViewSet,        basename="specialty")
router.register(r"services",            views.ServiceViewSet,           basename="service")
router.register(r"patients",            views.PatientViewSet,           basename="patient")
router.register(r"doctors",             views.DoctorViewSet,            basename="doctor")
router.register(r"schedules",           views.DoctorScheduleViewSet,    basename="schedule")
router.register(r"appointments",        views.AppointmentViewSet,       basename="appointment")
router.register(r"medical-records",     views.MedicalRecordViewSet,     basename="medical-record")
router.register(r"medicine-categories", views.MedicineCategoryViewSet,  basename="medicine-category")
router.register(r"medicines",           views.MedicineViewSet,          basename="medicine")
router.register(r"inventory",           views.InventoryViewSet,         basename="inventory")
router.register(r"inventory-alerts",    views.InventoryAlertViewSet,    basename="inventory-alert")
router.register(r"prescriptions",       views.PrescriptionViewSet,      basename="prescription")
router.register(r"payments",            views.PaymentViewSet,           basename="payment")
router.register(r"consultations",       views.ConsultationViewSet,      basename="consultation")
router.register(r"notifications",       views.NotificationViewSet,      basename="notification")

urlpatterns = [

    # ── Auth ─────────────────────────────────────────────────────────────
    path("auth/login/",           views.LoginView.as_view(),          name="login"),
    path("auth/register/",        views.RegisterView.as_view(),       name="register"),
    path("auth/me/",              views.MeView.as_view(),             name="me"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("auth/firebase-token/",  views.FirebaseTokenView.as_view(),  name="firebase-token"),

    # ── Admin Dashboard ──────────────────────────────────────────────────
    path("admin/dashboard/",         views.DashboardView.as_view(),        name="dashboard"),
    path("admin/dashboard/reports/", views.DashboardReportsView.as_view(), name="dashboard-reports"),

    # ── Doctor Dashboard & Tools ─────────────────────────────────────────
    path("doctor/dashboard/",           DoctorDashboardView.as_view(),        name="doctor-dashboard"),
    path("doctor/my-schedules/",        DoctorMyScheduleView.as_view(),       name="doctor-my-schedules"),
    path("doctor/today-appointments/",  DoctorTodayAppointmentsView.as_view(), name="doctor-today"),

    # ── Staff Dashboard & Tools ──────────────────────────────────────────
    path("staff/dashboard/",            StaffDashboardView.as_view(),         name="staff-dashboard"),
    path("staff/patients/",             StaffPatientListView.as_view(),       name="staff-patients"),
    path("staff/patients/<int:pk>/",    StaffPatientDetailView.as_view(),     name="staff-patient-detail"),
    path("staff/payments/",             StaffPaymentListView.as_view(),       name="staff-payments"),
    path("staff/inventory-alerts/",     StaffInventoryAlertView.as_view(),    name="staff-inventory-alerts"),

    # ── Router (CRUD) ────────────────────────────────────────────────────
    path("", include(router.urls)),
]

# ─────────────────────────────────────────────────────────────────────────────
# SCOPES & ROLES
# ─────────────────────────────────────────────────────────────────────────────
#
#  Role       Scope    Chức năng chính
#  ─────────  ───────  ──────────────────────────────────────────────────
#  patient    patient  Đặt lịch, xem hồ sơ, thanh toán, xem đơn thuốc
#  doctor     doctor   Khám bệnh, ghi hồ sơ, kê đơn, tư vấn video/chat
#  staff      staff    Confirm lịch, nhập kết quả CLS, cấp thuốc, thu tiền
#  admin      admin    Toàn quyền + báo cáo thống kê
#
# ─────────────────────────────────────────────────────────────────────────────
# CLINIC WORKFLOW 
# ─────────────────────────────────────────────────────────────────────────────
#
#  1. Patient đặt lịch      → POST /appointments/               [patient]
#  2. Staff xác nhận lịch   → PATCH /appointments/{id}/status/  [staff]
#  3. Patient check-in      → Appointment.status = confirmed
#  4. Doctor bắt đầu khám   → PATCH /appointments/{id}/status/  [doctor]
#                              status: confirmed → in_progress
#  5. Doctor ghi hồ sơ      → POST /medical-records/            [doctor]
#  6. Doctor chỉ định CLS   → POST /appointments/{id}/add_service/ [doctor]
#     (xét nghiệm/chụp phim)
#  7. Staff nhập kết quả    → POST /medical-records/{id}/test-results/ [staff|doctor]
#  8. Doctor kê đơn         → POST /prescriptions/              [doctor]
#  9. Doctor kết thúc khám  → PATCH /appointments/{id}/status/  [doctor]
#                              status: in_progress → completed
# 10. Staff cấp thuốc       → POST /prescriptions/{id}/dispense/ [staff]
# 11. Staff thu tiền         → POST /payments/{id}/confirm/      [staff]
#
# ─────────────────────────────────────────────────────────────────────────────
# BÁO CÁO THỐNG KÊ
# ─────────────────────────────────────────────────────────────────────────────
#
#  GET /api/admin/dashboard/reports/?type=age_group    — Bệnh nhân theo độ tuổi
#  GET /api/admin/dashboard/reports/?type=gender       — Bệnh nhân theo giới tính
#  GET /api/admin/dashboard/reports/?type=specialty    — Lượt khám theo chuyên khoa
#  GET /api/admin/dashboard/reports/?type=disease      — Bệnh phổ biến cộng đồng
#  GET /api/admin/dashboard/reports/?type=service      — Dịch vụ y tế sử dụng
#  GET /api/admin/dashboard/reports/?type=revenue&period=month — Doanh thu chi tiết
