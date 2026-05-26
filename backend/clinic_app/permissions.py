from rest_framework.permissions import BasePermission


class HasAdminScope(BasePermission):
    required_scopes = ["admin"]

class HasDoctorScope(BasePermission):
    required_scopes = ["doctor"]

class HasStaffScope(BasePermission):
    required_scopes = ["staff"]

class HasPatientScope(BasePermission):
    required_scopes = ["patient"]

class HasReadScope(BasePermission):
    required_scopes = ["read"]


def _get_token_scopes(request) -> set:
    token = getattr(request, "auth", None)
    if token is None:
        return set()
    return set(token.scope.split())


class HasDoctorOrAdminScope(BasePermission):
    message = "Yêu cầu scope 'doctor' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"doctor", "admin"} & _get_token_scopes(request))


class HasStaffOrAdminScope(BasePermission):
    message = "Yêu cầu scope 'staff' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"staff", "admin"} & _get_token_scopes(request))


class HasDoctorOrStaffScope(BasePermission):
    message = "Yêu cầu scope 'doctor' hoặc 'staff'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"doctor", "staff"} & _get_token_scopes(request))


class HasStaffDoctorOrAdminScope(BasePermission):
    message = "Yêu cầu scope 'staff', 'doctor' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"staff", "doctor", "admin"} & _get_token_scopes(request))


class HasPatientOrAdminScope(BasePermission):
    message = "Yêu cầu scope 'patient' hoặc 'admin'."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool({"patient", "admin"} & _get_token_scopes(request))


class IsAuthenticatedWithValidToken(BasePermission):
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
