"""
clinic_app/permissions.py

Hệ thống phân quyền dựa trên OAuth2 Scopes.

Scopes được cấp khi user lấy token qua /o/token/:
  - admin   → quản trị viên
  - doctor  → bác sĩ
  - patient → bệnh nhân
  - read    → chỉ đọc (default)
"""

from oauth2_provider.contrib.rest_framework import TokenHasScope
from rest_framework.permissions import BasePermission


# ─────────────────────────────────────────────
# Scope-based permissions
# ─────────────────────────────────────────────

class HasAdminScope(TokenHasScope):
    """Yêu cầu scope 'admin'."""
    required_scopes = ["admin"]


class HasDoctorScope(TokenHasScope):
    """Yêu cầu scope 'doctor'."""
    required_scopes = ["doctor"]


class HasPatientScope(TokenHasScope):
    """Yêu cầu scope 'patient'."""
    required_scopes = ["patient"]


class HasReadScope(TokenHasScope):
    """Yêu cầu ít nhất scope 'read' (GET/HEAD/OPTIONS)."""
    required_scopes = ["read"]


class HasDoctorOrAdminScope(BasePermission):
    """
    Cho phép nếu token có scope 'doctor' HOẶC 'admin'.
    Tương đương IsDoctorOrAdmin cũ.
    """
    message = "Yêu cầu scope 'doctor' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        token = getattr(request, "auth", None)
        if token is None:
            return False
        token_scopes = set(token.scope.split())
        return bool({"doctor", "admin"} & token_scopes)


class HasPatientOrAdminScope(BasePermission):
    """
    Cho phép nếu token có scope 'patient' HOẶC 'admin'.
    """
    message = "Yêu cầu scope 'patient' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        token = getattr(request, "auth", None)
        if token is None:
            return False
        token_scopes = set(token.scope.split())
        return bool({"patient", "admin"} & token_scopes)


class IsAuthenticatedWithValidToken(BasePermission):
    """
    Xác thực đơn giản: có token hợp lệ là đủ (bất kỳ scope nào).
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
    Object-level: chủ sở hữu hoặc token có scope 'admin'.
    Dùng kết hợp: permission_classes = [IsAuthenticatedWithValidToken, IsOwnerOrAdmin]
    """

    def _is_admin_scope(self, request) -> bool:
        token = getattr(request, "auth", None)
        if token is None:
            return False
        return "admin" in token.scope.split()

    def has_object_permission(self, request, view, obj):
        if self._is_admin_scope(request):
            return True
        # Patient profile
        if hasattr(obj, "user"):
            return obj.user == request.user
        # Appointment / Record → check patient.user
        if hasattr(obj, "patient"):
            return obj.patient.user == request.user
        return False


class IsPatientOwnerOrDoctor(BasePermission):
    """
    Bệnh nhân xem record của mình; bác sĩ xem record của bệnh nhân mình điều trị.
    Admin (scope='admin') xem tất cả.
    """

    def _token_scopes(self, request) -> set:
        token = getattr(request, "auth", None)
        if token is None:
            return set()
        return set(token.scope.split())

    def has_object_permission(self, request, view, obj):
        scopes = self._token_scopes(request)
        if "admin" in scopes:
            return True
        if "patient" in scopes:
            return obj.patient.user == request.user
        if "doctor" in scopes:
            return obj.doctor.user == request.user
        return False