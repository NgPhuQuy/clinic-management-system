"""
clinic_app/views/payment.py

Endpoints:
  GET  /api/payments/              — Lịch sử thanh toán [any auth]
  GET  /api/payments/{id}/         — Chi tiết            [any auth]
  POST /api/payments/init/         — Khởi tạo thanh toán [patient scope]
  POST /api/payments/{id}/confirm/ — Xác nhận thanh toán [admin scope]

BUG ĐÃ SỬA:
  1. get_queryset() dùng `user.role == "patient"` → thay bằng token scope (OAuth2-consistent)
  2. get_permissions() dùng `IsAuthenticated` (Django session) → thay bằng IsAuthenticatedWithValidToken
  3. confirm() không có permission restriction → thêm HasAdminScope
     (staff đã bị loại; admin xác nhận thanh toán)
  4. Xóa import IsAuthenticated không còn cần
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Payment, Appointment
from ..serializers import PaymentSerializer, PaymentInitSerializer
from ..permissions import HasPatientScope, HasAdminScope, IsAuthenticatedWithValidToken


def _get_token_scopes(request) -> set:
    """Helper: trả về set scope từ OAuth2 token của request."""
    token = getattr(request, "auth", None)
    if token is None:
        return set()
    return set(token.scope.split())


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/payments/       — Lịch sử thanh toán
    GET /api/payments/{id}/  — Chi tiết
    """
    queryset = Payment.objects.select_related("patient", "appointment").all()
    serializer_class = PaymentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "payment_method"]

    def get_queryset(self):
        """
        BUG FIX: dùng token scope thay vì user.role để đồng nhất với OAuth2.
          - scope 'patient' → chỉ thấy thanh toán của mình
          - scope 'admin'   → thấy tất cả
          - scope 'doctor'  → thấy tất cả (cần xem bệnh nhân đã trả chưa)
        """
        qs = super().get_queryset()
        scopes = _get_token_scopes(self.request)

        if "admin" in scopes or "doctor" in scopes:
            return qs
        if "patient" in scopes:
            return qs.filter(patient__user=self.request.user)
        return qs.none()

    def get_permissions(self):
        """
        BUG FIX:
          - Đổi IsAuthenticated → IsAuthenticatedWithValidToken (OAuth2-aware)
          - confirm action yêu cầu HasAdminScope (staff đã bị loại)
          - Mỗi action phải khai báo tường minh vì override get_permissions()
            sẽ silently ignore @action(permission_classes=[...])
        """
        if self.action == "init":
            return [HasPatientScope()]
        if self.action == "confirm":
            return [HasAdminScope()]          # ← BUG FIX: không có restriction cũ
        return [IsAuthenticatedWithValidToken()]   # ← BUG FIX: IsAuthenticated → OAuth2

    @action(detail=False, methods=["post"])
    def init(self, request):
        """
        POST /api/payments/init/
        Bệnh nhân khởi tạo thanh toán → trả về payment_url từ cổng TT.
        """
        serializer = PaymentInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = get_object_or_404(
            Appointment,
            pk=serializer.validated_data["appointment_id"],
            patient__user=request.user,
        )

        total = appointment.doctor.consultation_fee
        for svc in appointment.appointment_services.all():
            total += svc.get_subtotal()

        payment, _ = Payment.objects.get_or_create(
            appointment=appointment,
            defaults={
                "patient": request.user.patient_profile,
                "amount": total,
                "payment_method": serializer.validated_data["payment_method"],
                "status": "pending",
            },
        )

        # TODO: tích hợp thực tế MoMo/VNPay SDK ở đây
        payment_url = (
            f"https://payment-gateway.example.com/pay"
            f"?order={payment.id}&amount={total}"
        )
        return Response({
            "payment_id": payment.id,
            "amount": total,
            "payment_url": payment_url,
        })

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """
        POST /api/payments/{id}/confirm/ — Xác nhận thanh toán thành công.
        Chỉ Admin mới được gọi (scope 'admin').
        BUG FIX: trước đây không có permission check → ai cũng confirm được.
        """
        payment = self.get_object()
        payment.status = "success"
        payment.paid_at = timezone.now()
        payment.transaction_id = request.data.get("transaction_id", "")
        payment.save()
        return Response(PaymentSerializer(payment).data)