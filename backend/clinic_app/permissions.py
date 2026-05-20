"""
clinic_app/permissions.py

Hệ thống phân quyền dựa trên OAuth2 Scopes.

Scopes được cấp khi user lấy token qua /o/token/:
  - admin   → quản trị viên (toàn quyền)
  - doctor  → bác sĩ (khám, ghi hồ sơ, kê đơn)
  - staff   → nhân viên y tế (tiếp nhận, cấp thuốc, thu tiền, nhập kết quả)
  - patient → bệnh nhân (đặt lịch, xem hồ sơ, thanh toán)
  - read    → chỉ đọc (default fallback)

Phân cấp quyền:
  admin > (doctor | staff) > patient
"""

from oauth2_provider.contrib.rest_framework import TokenHasScope
from rest_framework.permissions import BasePermission


# ─────────────────────────────────────────────
# Single-scope permissions
# ─────────────────────────────────────────────

class HasAdminScope(TokenHasScope):
    """Yêu cầu scope 'admin'."""
    required_scopes = ["admin"]


class HasDoctorScope(TokenHasScope):
    """Yêu cầu scope 'doctor'."""
    required_scopes = ["doctor"]


class HasStaffScope(TokenHasScope):
    """Yêu cầu scope 'staff'. Nhân viên y tế: lễ tân, điều dưỡng, dược sĩ, thu ngân."""
    required_scopes = ["staff"]


class HasPatientScope(TokenHasScope):
    """Yêu cầu scope 'patient'."""
    required_scopes = ["patient"]


class HasReadScope(TokenHasScope):
    """Yêu cầu ít nhất scope 'read'."""
    required_scopes = ["read"]


# ─────────────────────────────────────────────
# Combined-scope permissions
# ─────────────────────────────────────────────

def _get_token_scopes(request) -> set:
    token = getattr(request, "auth", None)
    if token is None:
        return set()
    return set(token.scope.split())


class HasDoctorOrAdminScope(BasePermission):
    """
    scope 'doctor' HOẶC 'admin'.
    Dùng cho: ghi hồ sơ bệnh án, kê đơn thuốc.
    """
    message = "Yêu cầu scope 'doctor' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"doctor", "admin"} & _get_token_scopes(request))


class HasStaffOrAdminScope(BasePermission):
    """
    scope 'staff' HOẶC 'admin'.
    Dùng cho: cấp phát thuốc, xác nhận thanh toán tiền mặt, nhập kho.
    """
    message = "Yêu cầu scope 'staff' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"staff", "admin"} & _get_token_scopes(request))


class HasDoctorOrStaffScope(BasePermission):
    """
    scope 'doctor' HOẶC 'staff'.
    Dùng cho: nhập kết quả xét nghiệm (doctor chỉ định, staff nhập kết quả).
    """
    message = "Yêu cầu scope 'doctor' hoặc 'staff'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"doctor", "staff"} & _get_token_scopes(request))


class HasStaffDoctorOrAdminScope(BasePermission):
    """
    scope 'staff' HOẶC 'doctor' HOẶC 'admin'.
    Dùng cho: confirm appointment (staff lễ tân hoặc doctor hoặc admin đều được).
    """
    message = "Yêu cầu scope 'staff', 'doctor' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"staff", "doctor", "admin"} & _get_token_scopes(request))


class HasPatientOrAdminScope(BasePermission):
    """
    scope 'patient' HOẶC 'admin'.
    Dùng cho: patient tự xem thông tin của mình, admin xem tất cả.
    """
    message = "Yêu cầu scope 'patient' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"patient", "admin"} & _get_token_scopes(request))


# ─────────────────────────────────────────────
# Generic authenticated
# ─────────────────────────────────────────────

class IsAuthenticatedWithValidToken(BasePermission):
    """
    Có token hợp lệ là đủ (bất kỳ scope nào).
    Thay thế IsAuthenticated + OAuth2Authentication.
    """
    message = "Yêu cầu đăng nhập với OAuth2 token hợp lệ."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request, "auth", None) is not None
        )


# ─────────────────────────────────────────────
# Object-level permissions
# ─────────────────────────────────────────────

class IsOwnerOrAdmin(BasePermission):
    """
    Object-level: chủ sở hữu hoặc admin.
    Dùng kết hợp: [IsAuthenticatedWithValidToken, IsOwnerOrAdmin]
    """
    def has_object_permission(self, request, view, obj):
        if "admin" in _get_token_scopes(request):
            return True
        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "patient"):
            return obj.patient.user == request.user
        return False


class IsPatientOwnerOrDoctor(BasePermission):
    """
    Bệnh nhân xem record của mình; bác sĩ xem record bệnh nhân mình điều trị.
    Admin xem tất cả.
    """
    def has_object_permission(self, request, view, obj):
        scopes = _get_token_scopes(request)
        if "admin"   in scopes: return True
        if "patient" in scopes: return obj.patient.user == request.user
        if "doctor"  in scopes: return obj.doctor.user  == request.user
        return False
