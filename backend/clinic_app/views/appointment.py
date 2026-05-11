"""
clinic_app/views/appointment.py
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Appointment
from ..serializers import (
    AppointmentSerializer,
    AppointmentCreateSerializer,
    AppointmentStatusSerializer,
    AppointmentServiceSerializer,
)
from ..permissions import (
    IsAuthenticatedWithValidToken,
    HasPatientScope,
    HasDoctorOrAdminScope,
)


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    POST  /appointments/              — Bệnh nhân đặt lịch  [scope: patient]
    GET   /appointments/              — Danh sách           [scope: any]
    GET   /appointments/{id}/         — Chi tiết            [scope: any]
    PATCH /appointments/{id}/status/  — Cập nhật trạng thái [scope: doctor|admin]
    POST  /appointments/{id}/add_service/ — Thêm dịch vụ   [scope: doctor|admin]
    """
    queryset = Appointment.objects.select_related(
        "patient", "doctor__specialty", "schedule"
    ).prefetch_related("appointment_services__service")
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "doctor", "patient"]
    ordering_fields = ["appointment_date", "created_at"]
    ordering = ["-appointment_date"]

    def get_serializer_class(self):
        if self.action == "create":
            return AppointmentCreateSerializer
        if self.action == "update_status":
            return AppointmentStatusSerializer
        return AppointmentSerializer

    def get_permissions(self):
        if self.action == "create":
            return [HasPatientScope()]
        if self.action in ("update_status", "add_service"):
            return [HasDoctorOrAdminScope()]
        return [IsAuthenticatedWithValidToken()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        token = getattr(self.request, "auth", None)
        token_scopes = set(token.scope.split()) if token else set()

        if "admin" in token_scopes:
            return qs
        if "doctor" in token_scopes:
            return qs.filter(doctor__user=user)
        if "patient" in token_scopes:
            return qs.filter(patient__user=user)
        return qs.none()

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        """PATCH /appointments/{id}/status/ — Đổi trạng thái lịch hẹn."""
        appointment = self.get_object()
        serializer = AppointmentStatusSerializer(
            appointment,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AppointmentSerializer(serializer.instance).data)

    @action(detail=True, methods=["post"], url_path="add_service")
    def add_service(self, request, pk=None):
        """POST /appointments/{id}/add_service/ — Thêm dịch vụ vào lịch hẹn."""
        appointment = self.get_object()
        serializer = AppointmentServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(appointment=appointment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)