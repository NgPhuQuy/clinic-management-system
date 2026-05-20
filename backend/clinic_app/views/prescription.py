"""
clinic_app/views/prescription.py

Phân quyền theo nghiệp vụ:
  - Kê đơn (create):         doctor
  - Xem đơn thuốc:           doctor (của mình) | patient (của mình) | staff | admin
  - Thêm thuốc vào đơn:      doctor
  - Cấp phát thuốc (dispense): staff | admin   ← nhân viên dược/điều dưỡng tại quầy

BUG ĐÃ SỬA:
  1. get_permissions() fallback dùng IsAuthenticated → IsAuthenticatedWithValidToken
  2. get_queryset() dùng user.role → token scope
  3. dispense() không có permission check → HasStaffOrAdminScope
  4. CRITICAL: Double-deduction — dispense() view tự trừ kho, signal cũng trừ.
     Đã sửa: chỉ view trừ kho, signal chỉ gửi notification (xem signals.py).
"""
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Prescription, Inventory
from ..serializers import PrescriptionSerializer, PrescriptionDetailSerializer
from ..permissions import (
    HasDoctorScope,
    HasDoctorOrAdminScope,
    HasStaffOrAdminScope,
    IsAuthenticatedWithValidToken,
)


def _get_token_scopes(request) -> set:
    token = getattr(request, "auth", None)
    if token is None:
        return set()
    return set(token.scope.split())


class PrescriptionViewSet(viewsets.ModelViewSet):
    """
    POST /prescriptions/              — Bác sĩ kê đơn
    GET  /prescriptions/              — Danh sách đơn thuốc
    GET  /prescriptions/{id}/         — Chi tiết
    POST /prescriptions/{id}/dispense/ — Staff cấp phát thuốc
    POST /prescriptions/{id}/add_medicine/ — Bác sĩ thêm thuốc
    """
    queryset = Prescription.objects.prefetch_related(
        "details__medicine"
    ).select_related("patient", "doctor").all()
    serializer_class  = PrescriptionSerializer
    filter_backends   = [DjangoFilterBackend]
    filterset_fields  = ["status", "patient", "doctor"]

    def get_permissions(self):
        if self.action == "create":
            return [HasDoctorScope()]
        if self.action in ("update", "partial_update"):
            return [HasDoctorOrAdminScope()]
        if self.action == "add_medicine":
            return [HasDoctorScope()]
        if self.action == "dispense":
            # BUG FIX: chỉ staff và admin mới cấp phát thuốc
            return [HasStaffOrAdminScope()]
        # BUG FIX: fallback dùng OAuth2-aware permission
        return [IsAuthenticatedWithValidToken()]

    def get_queryset(self):
        user   = self.request.user
        qs     = super().get_queryset()
        # BUG FIX: dùng token scope thay vì user.role
        scopes = _get_token_scopes(self.request)

        if "admin"  in scopes: return qs
        if "staff"  in scopes: return qs          # staff thấy tất cả để quản lý quầy thuốc
        if "doctor" in scopes: return qs.filter(doctor__user=user)
        if "patient" in scopes: return qs.filter(patient__user=user)
        return qs.none()

    def perform_create(self, serializer):
        doctor = self.request.user.doctor_profile
        serializer.save(doctor=doctor)

    @action(detail=True, methods=["post"])
    def dispense(self, request, pk=None):
        """
        POST /prescriptions/{id}/dispense/
        Nhân viên dược/điều dưỡng cấp phát thuốc tại quầy.

        Flow:
          1. Kiểm tra đơn chưa cấp phát
          2. Kiểm tra tồn kho đủ không (dry-run)
          3. Trừ kho theo FEFO (First Expired First Out)
          4. Set status → dispensed
          5. Signal tự động gửi notification cho bệnh nhân

        NOTE: Việc trừ kho CHỈ xảy ra ở đây — signal KHÔNG trừ kho thêm lần nữa.
        """
        prescription = self.get_object()

        if prescription.status == "dispensed":
            return Response(
                {"detail": "Đơn thuốc đã được cấp phát rồi."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if prescription.status == "cancelled":
            return Response(
                {"detail": "Đơn thuốc đã bị hủy, không thể cấp phát."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Bước 1: Kiểm tra tồn kho trước (dry-run) ──
        shortage_errors = []
        for detail in prescription.details.select_related("medicine").all():
            available = (
                Inventory.objects
                .filter(
                    medicine=detail.medicine,
                    expiry_date__gt=timezone.now().date(),
                    quantity__gt=0,
                )
                .aggregate(total=__import__("django.db.models", fromlist=["Sum"]).Sum("quantity"))
            )["total"] or 0

            if available < detail.quantity:
                shortage_errors.append(
                    f"Không đủ tồn kho: {detail.medicine.name} "
                    f"(cần {detail.quantity}, hiện có {available} {detail.medicine.unit})"
                )

        if shortage_errors:
            return Response(
                {"detail": "Không đủ thuốc để cấp phát.", "errors": shortage_errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Bước 2: Trừ kho theo FEFO ──
        for detail in prescription.details.select_related("medicine").all():
            remaining = detail.quantity
            batches   = (
                Inventory.objects
                .filter(
                    medicine=detail.medicine,
                    expiry_date__gt=timezone.now().date(),
                    quantity__gt=0,
                )
                .order_by("expiry_date")   # FEFO: lô gần hết hạn dùng trước
            )

            for batch in batches:
                if remaining <= 0:
                    break
                deduct         = min(batch.quantity, remaining)
                batch.quantity -= deduct
                batch.save(update_fields=["quantity"])  # trigger check_inventory_alerts signal
                remaining      -= deduct

        # ── Bước 3: Cập nhật đơn thuốc ──
        prescription.status       = "dispensed"
        prescription.dispensed_at = timezone.now()
        prescription.save()
        # Signal on_prescription_saved sẽ gửi notification cho bệnh nhân tự động

        return Response(PrescriptionSerializer(prescription).data)

    @action(detail=True, methods=["post"])
    def add_medicine(self, request, pk=None):
        """POST /prescriptions/{id}/add_medicine/ — Thêm thuốc vào đơn."""
        prescription = self.get_object()
        if prescription.status != "pending":
            return Response(
                {"detail": "Chỉ có thể thêm thuốc vào đơn đang chờ cấp phát."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = PrescriptionDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(prescription=prescription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
