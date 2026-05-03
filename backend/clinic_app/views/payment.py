from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Payment, Appointment
from ..serializers import PaymentSerializer, PaymentInitSerializer
from ..permissions import IsPatient, IsStaff


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
        user = self.request.user
        qs = super().get_queryset()
        if user.role == "patient":
            return qs.filter(patient__user=user)
        return qs

    def get_permissions(self):
        return [IsAuthenticated()]

    @action(detail=False, methods=["post"], permission_classes=[IsPatient])
    def init(self, request):
        """
        POST /api/payments/init/
        Khởi tạo thanh toán → trả về payment_url từ cổng TT.
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
        payment_url = f"https://payment-gateway.example.com/pay?order={payment.id}&amount={total}"
        return Response({"payment_id": payment.id, "amount": total, "payment_url": payment_url})

    @action(detail=True, methods=["post"], permission_classes=[IsStaff])
    def confirm(self, request, pk=None):
        """POST /api/payments/{id}/confirm/ — Xác nhận thanh toán thành công (webhook/manual)."""
        payment = self.get_object()
        payment.status = "success"
        payment.paid_at = timezone.now()
        payment.transaction_id = request.data.get("transaction_id", "")
        payment.save()
        return Response(PaymentSerializer(payment).data)
