from .test_auth import (
    RegisterTests,
    LoginTests,
    TokenRefreshTests,
    TokenVerifyTests,
    MeViewTests,
    ChangePasswordTests,
)
from .test_permissions import (
    AnonymousAccessTests,
    PublicEndpointTests,
    AdminAccessTests,
    PatientAccessTests,
    DoctorAccessTests,
    StaffAccessTests,
)
from .test_api_appointment import (
    AppointmentCreateTests,
    AppointmentListTests,
    AppointmentStatusUpdateTests,
)
from .test_api_medicine import (
    MedicineListTests,
    MedicineCreateTests,
    InventoryTests,
    LowStockTests,
    NearExpiryTests,
    InventoryAlertTests,
)
from .test_api_payment import (
    PaymentInitTests,
    PaymentListTests,
)

__all__ = [
    # Auth
    "RegisterTests",
    "LoginTests",
    "TokenRefreshTests",
    "TokenVerifyTests",
    "MeViewTests",
    "ChangePasswordTests",
    # Permissions
    "AnonymousAccessTests",
    "PublicEndpointTests",
    "AdminAccessTests",
    "PatientAccessTests",
    "DoctorAccessTests",
    "StaffAccessTests",
    # Appointment
    "AppointmentCreateTests",
    "AppointmentListTests",
    "AppointmentStatusUpdateTests",
    # Medicine
    "MedicineListTests",
    "MedicineCreateTests",
    "InventoryTests",
    "LowStockTests",
    "NearExpiryTests",
    "InventoryAlertTests",
    # Payment
    "PaymentInitTests",
    "PaymentListTests",
]