"""
clinic_app/views/appointment.py

Phân quyền theo nghiệp vụ phòng khám:
  - Đặt lịch:           patient
  - Confirm/check-in:   staff | doctor | admin   (lễ tân tiếp nhận bệnh nhân)
  - Bắt đầu khám:       doctor | admin           (bác sĩ chuyển sang in_progress)
  - Thêm dịch vụ CLS:   doctor | staff | admin   (chỉ định thêm xét nghiệm)
  - Hoàn thành/hủy:     doctor | staff | admin
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Appointment, Payment
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
    HasStaffDoctorOrAdminScope,
    HasStaffOrAdminScope,
)
from ..utils import get_token_scopes


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    POST   /appointments/                  — Bệnh nhân đặt lịch      [patient]
    GET    /appointments/                  — Danh sách                [any]
    GET    /appointments/{id}/             — Chi tiết                 [any]
    PATCH  /appointments/{id}/status/      — Cập nhật trạng thái      [staff|doctor|admin]
    POST   /appointments/{id}/add_service/ — Thêm dịch vụ/xét nghiệm [doctor|staff|admin]

    Flow trạng thái:
      PENDING → CONFIRMED (staff/doctor/admin xác nhận)
             → IN_PROGRESS (doctor bắt đầu khám)
             → COMPLETED (doctor/staff hoàn thành)
             → CANCELLED (staff/doctor/admin hủy)
             → NO_SHOW (staff/admin đánh dấu vắng)
    """
    queryset = Appointment.objects.select_related(
        "patient", "doctor__specialty", "schedule"
    ).prefetch_related("appointment_services__service")
    filter_backends   = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields  = ["status", "doctor", "patient"]
    ordering_fields   = ["appointment_date", "created_at"]
    ordering          = ["-appointment_date"]

    def get_serializer_class(self):
        if self.action == "create":
            return AppointmentCreateSerializer
        if self.action == "update_status":
            return AppointmentStatusSerializer
        return AppointmentSerializer

    def get_permissions(self):
        if self.action == "create":
            return [HasPatientScope()]
        if self.action == "update_status":
            # serializer.validate_status handles per-role transition rules (incl. patient cancel)
            return [IsAuthenticatedWithValidToken()]
        if self.action == "add_service":
            return [HasStaffDoctorOrAdminScope()]
        return [IsAuthenticatedWithValidToken()]

    def get_queryset(self):
        user   = self.request.user
        qs     = super().get_queryset()
        scopes = get_token_scopes(self.request)

        if "admin"  in scopes: return qs
        if "staff"  in scopes: return qs
        if "doctor" in scopes: return qs.filter(doctor__user=user)
        if "patient" in scopes: return qs.filter(patient__user=user)
        return qs.none()

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        """
        PATCH /appointments/{id}/status/
        Đổi trạng thái lịch hẹn.

        Quy tắc nghiệp vụ:
          - staff/admin: PENDING → CONFIRMED, CONFIRMED → NO_SHOW
          - doctor:      CONFIRMED → IN_PROGRESS → COMPLETED
          - staff/admin: bất kỳ → CANCELLED
        """
        appointment = self.get_object()
        serializer  = AppointmentStatusSerializer(
            appointment,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Auto-refund khi hủy lịch: đánh dấu các payment pending/success → refunded
        if serializer.instance.status == "cancelled":
            try:
                serializer.instance.invoice.payments.filter(
                    status__in=[Payment.Status.SUCCESS, Payment.Status.PENDING]
                ).update(status=Payment.Status.REFUNDED)
            except Exception:
                pass

        return Response(AppointmentSerializer(serializer.instance).data)

    @action(detail=True, methods=["post"], url_path="add_service")
    def add_service(self, request, pk=None):
        """
        POST /appointments/{id}/add_service/
        Thêm dịch vụ/xét nghiệm vào lịch hẹn.
        Bác sĩ chỉ định xét nghiệm → staff thực hiện.
        """
        appointment = self.get_object()
        serializer  = AppointmentServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(appointment=appointment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
