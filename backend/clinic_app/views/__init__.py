from .auth import (
    RegisterView, LoginView, MeView, ChangePasswordView,
    GoogleOAuthRedirectView, GoogleOAuthCallbackView,
)
from .specialty import SpecialtyViewSet, ServiceViewSet
from .patient import PatientViewSet
from .doctor import DoctorViewSet, DoctorScheduleViewSet
from .appointment import AppointmentViewSet
from .medical_record import MedicalRecordViewSet, TestResultViewSet
from .medicine import MedicineCategoryViewSet, MedicineViewSet, InventoryViewSet, InventoryAlertViewSet
from .prescription import PrescriptionViewSet
from .payment import PaymentViewSet
from .consultation import ConsultationViewSet
from .notification import NotificationViewSet
from .dashboard import DashboardView
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
    "RegisterView", "LoginView", "MeView", "ChangePasswordView",
    "GoogleOAuthRedirectView", "GoogleOAuthCallbackView",
    "SpecialtyViewSet", "ServiceViewSet",
    "PatientViewSet",
    "DoctorViewSet", "DoctorScheduleViewSet",
    "AppointmentViewSet",
    "MedicalRecordViewSet", "TestResultViewSet",
    "MedicineCategoryViewSet", "MedicineViewSet", "InventoryViewSet", "InventoryAlertViewSet",
    "PrescriptionViewSet",
    "PaymentViewSet",
    "ConsultationViewSet",
    "NotificationViewSet",
    "DashboardView",
    "DoctorDashboardView", "StaffDashboardView",
    "StaffPatientListView", "StaffPatientDetailView",
    "StaffPaymentListView",
    "DoctorMyScheduleView", "DoctorTodayAppointmentsView",
    "StaffInventoryAlertView",
]
