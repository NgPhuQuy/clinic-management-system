"""
clinic_app/views/payment.py

Phân quyền theo nghiệp vụ:
  - Khởi tạo thanh toán:          patient
  - Xem lịch sử:                  patient (của mình) | staff | doctor | admin
  - Xác nhận thu tiền mặt:        staff | admin   ← thu ngân xác nhận
  - Xác nhận online (callback):   system/admin

Endpoints:
  GET  /payments/              — Lịch sử thanh toán
  GET  /payments/{id}/         — Chi tiết
  POST /payments/init/         — Khởi tạo thanh toán [patient]
  POST /payments/{id}/confirm/ — Xác nhận thu tiền   [staff|admin]
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Payment, Appointment
from ..serializers import PaymentSerializer, PaymentInitSerializer
from ..permissions import HasPatientScope, HasStaffOrAdminScope, IsAuthenticatedWithValidToken


def _get_token_scopes(request) -> set:
    token = getattr(request, "auth", None)
    if token is None:
        return set()
    return set(token.scope.split())


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset         = Payment.objects.select_related("patient", "appointment").all()
    serializer_class = PaymentSerializer
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ["status", "payment_method"]

    def get_queryset(self):
        qs     = super().get_queryset()
        scopes = _get_token_scopes(self.request)

        if "admin"  in scopes: return qs
        if "staff"  in scopes: return qs          # staff thu ngân thấy tất cả
        if "doctor" in scopes: return qs          # bác sĩ cần biết bệnh nhân đã trả chưa
        if "patient" in scopes:
            return qs.filter(patient__user=self.request.user)
        return qs.none()

    def get_permissions(self):
        if self.action == "init":
            return [HasPatientScope()]
        if self.action == "confirm":
            # BUG FIX: admin-only → staff hoặc admin (thu ngân xác nhận tiền mặt)
            return [HasStaffOrAdminScope()]
        return [IsAuthenticatedWithValidToken()]

    @action(detail=False, methods=["post"])
    def init(self, request):
        """
        POST /payments/init/
        Bệnh nhân khởi tạo thanh toán.

        TODO: tích hợp thực tế MoMo/VNPay SDK để có payment_url thật.
        """
        serializer = PaymentInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = get_object_or_404(
            Appointment,
            pk=serializer.validated_data["appointment_id"],
            patient__user=request.user,
        )

        # Tính tổng tiền: phí khám + dịch vụ
        total = appointment.doctor.consultation_fee
        for svc in appointment.appointment_services.all():
            total += svc.get_subtotal()

        payment, _ = Payment.objects.get_or_create(
            appointment=appointment,
            defaults={
                "patient":        request.user.patient_profile,
                "amount":         total,
                "payment_method": serializer.validated_data["payment_method"],
                "status":         "pending",
            },
        )

        # TODO: tích hợp MoMo/VNPay thực
        payment_url = (
            f"https://payment-gateway.example.com/pay"
            f"?order={payment.id}&amount={total}"
        )
        return Response({
            "payment_id":   payment.id,
            "amount":       total,
            "payment_url":  payment_url,
        })

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """
        POST /payments/{id}/confirm/
        Nhân viên thu ngân xác nhận đã nhận tiền (đặc biệt tiền mặt).

        Request body (optional):
          {
            "transaction_id": "CASH-001",   // mã phiếu thu
            "notes": "Đã thu tiền mặt"
          }
        """
        payment = self.get_object()

        if payment.status == "success":
            return Response(
                {"detail": "Đã xác nhận thanh toán trước đó rồi."},
                status=400,
            )
        if payment.status == "refunded":
            return Response(
                {"detail": "Không thể xác nhận thanh toán đã hoàn tiền."},
                status=400,
            )

        payment.status         = "success"
        payment.paid_at        = timezone.now()
        payment.transaction_id = request.data.get("transaction_id", f"MANUAL-{payment.pk}")
        payment.save()

        return Response(PaymentSerializer(payment).data)
