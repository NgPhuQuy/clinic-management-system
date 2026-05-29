from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views.consultation import VideoCallPageView
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
router.register(r"test-results",        views.TestResultViewSet,        basename="test-result")
router.register(r"medicine-categories", views.MedicineCategoryViewSet,  basename="medicine-category")
router.register(r"medicines",           views.MedicineViewSet,          basename="medicine")
router.register(r"inventory",           views.InventoryViewSet,         basename="inventory")
router.register(r"inventory-alerts",    views.InventoryAlertViewSet,    basename="inventory-alert")
router.register(r"prescriptions",       views.PrescriptionViewSet,      basename="prescription")
router.register(r"payments",            views.PaymentViewSet,           basename="payment")
router.register(r"consultations",       views.ConsultationViewSet,      basename="consultation")
router.register(r"notifications",       views.NotificationViewSet,      basename="notification")

urlpatterns = [
    path("video-call/",            VideoCallPageView.as_view(),        name="video-call-page"),
    path("auth/login/",           views.LoginView.as_view(),          name="login"),
    path("auth/google/",           views.GoogleOAuthRedirectView.as_view(), name="google-oauth"),
    path("auth/google/callback/",  views.GoogleOAuthCallbackView.as_view(), name="google-callback"),
    path("auth/register/",        views.RegisterView.as_view(),       name="register"),
    path("auth/me/",              views.MeView.as_view(),             name="me"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change-password"),

    path("admin/dashboard/", views.DashboardView.as_view(), name="dashboard"),

    path("doctor/dashboard/",           DoctorDashboardView.as_view(),        name="doctor-dashboard"),
    path("doctor/my-schedules/",        DoctorMyScheduleView.as_view(),       name="doctor-my-schedules"),
    path("doctor/today-appointments/",  DoctorTodayAppointmentsView.as_view(), name="doctor-today"),

    path("staff/dashboard/",            StaffDashboardView.as_view(),         name="staff-dashboard"),
    path("staff/patients/",             StaffPatientListView.as_view(),       name="staff-patients"),
    path("staff/patients/<int:pk>/",    StaffPatientDetailView.as_view(),     name="staff-patient-detail"),
    path("staff/payments/",             StaffPaymentListView.as_view(),       name="staff-payments"),
    path("staff/inventory-alerts/",     StaffInventoryAlertView.as_view(),    name="staff-inventory-alerts"),

    path("", include(router.urls)),
]
