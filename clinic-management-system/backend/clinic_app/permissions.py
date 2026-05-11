from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class IsDoctor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "doctor")


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "patient")


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ("staff", "admin")
        )


class IsDoctorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ("doctor", "admin")
        )


class IsOwnerOrAdmin(BasePermission):
    """Object-level: chỉ chủ sở hữu hoặc admin được truy cập."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        # Patient profile
        if hasattr(obj, "user"):
            return obj.user == request.user
        # Appointment / Record → check patient.user
        if hasattr(obj, "patient"):
            return obj.patient.user == request.user
        return False


class IsPatientOwnerOrDoctor(BasePermission):
    """Bệnh nhân chỉ xem record của mình; bác sĩ xem record của bệnh nhân mình điều trị."""
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == "admin":
            return True
        if user.role == "patient":
            return obj.patient.user == user
        if user.role == "doctor":
            return obj.doctor.user == user
        return False