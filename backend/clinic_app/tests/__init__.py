from .test_auth import (
    RegisterTests,
    OAuth2TokenTests,
    TokenIntrospectTests,
    MeViewTests,
    ChangePasswordTests,
)
from .test_permissions import (
    AnonymousAccessTests,
    PublicEndpointTests,
    AdminScopeTests,
    PatientScopeTests,
    DoctorScopeTests,
    ScopeIsolationTests,
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
    PaymentConfirmTests,
)

__all__ = [
    # Auth
    "RegisterTests",
    "OAuth2TokenTests",
    "TokenIntrospectTests",
    "MeViewTests",
    "ChangePasswordTests",
    # Permissions
    "AnonymousAccessTests",
    "PublicEndpointTests",
    "AdminScopeTests",
    "PatientScopeTests",
    "DoctorScopeTests",
    "ScopeIsolationTests",
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
    "PaymentConfirmTests",
]
