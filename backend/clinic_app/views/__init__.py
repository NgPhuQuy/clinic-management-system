from .auth import RegisterView, LoginView, MeView, ChangePasswordView, FirebaseTokenView
from .specialty import SpecialtyViewSet, ServiceViewSet
from .patient import PatientViewSet
from .doctor import DoctorViewSet, DoctorScheduleViewSet
from .appointment import AppointmentViewSet
from .medical_record import MedicalRecordViewSet
from .medicine import MedicineCategoryViewSet, MedicineViewSet, InventoryViewSet, InventoryAlertViewSet
from .prescription import PrescriptionViewSet
from .payment import PaymentViewSet
from .consultation import ConsultationViewSet
from .notification import NotificationViewSet
from .dashboard import DashboardView, DashboardReportsView
# ─── Thêm mới: Doctor & Staff views ─────────────────────────────────────────
from .staff_doctor import (
    DoctorDashboardView,
    StaffDashboardView,
    StaffPatientListView,
    StaffPatientDetailView,
    StaffPaymentListView,
    DoctorMyScheduleView,
    DoctorTodayAppointmentsView,
    StaffInventoryAlertView,
)

__all__ = [
    "RegisterView", "LoginView", "MeView", "ChangePasswordView", "FirebaseTokenView",
    "SpecialtyViewSet", "ServiceViewSet",
    "PatientViewSet",
    "DoctorViewSet", "DoctorScheduleViewSet",
    "AppointmentViewSet",
    "MedicalRecordViewSet",
    "MedicineCategoryViewSet", "MedicineViewSet", "InventoryViewSet", "InventoryAlertViewSet",
    "PrescriptionViewSet",
    "PaymentViewSet",
    "ConsultationViewSet",
    "NotificationViewSet",
    "DashboardView", "DashboardReportsView",
    # Doctor & Staff
    "DoctorDashboardView", "StaffDashboardView",
    "StaffPatientListView", "StaffPatientDetailView",
    "StaffPaymentListView",
    "DoctorMyScheduleView", "DoctorTodayAppointmentsView",
    "StaffInventoryAlertView",
]