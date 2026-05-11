from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Prescription, Inventory
from ..serializers import PrescriptionSerializer, PrescriptionDetailSerializer
from ..permissions import HasDoctorScope, HasDoctorOrAdminScope


class PrescriptionViewSet(viewsets.ModelViewSet):
    """
    POST /api/prescriptions/       — Bác sĩ kê đơn
    GET  /api/prescriptions/{id}/  — Chi tiết đơn thuốc
    """
    queryset = Prescription.objects.prefetch_related("details__medicine").select_related(
        "patient", "doctor"
    ).all()
    serializer_class = PrescriptionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "patient", "doctor"]

    def get_permissions(self):
        if self.action == "create":
            return [HasDoctorScope()]
        if self.action in ("update", "partial_update"):
            return [HasDoctorOrAdminScope()]
        if self.action == "add_medicine":
            return [HasDoctorScope()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.role == "patient":
            return qs.filter(patient__user=user)
        if user.role == "doctor":
            return qs.filter(doctor__user=user)
        return qs

    def perform_create(self, serializer):
        doctor = self.request.user.doctor_profile
        serializer.save(doctor=doctor)

    @action(detail=True, methods=["post"])
    def dispense(self, request, pk=None):
        """POST /api/prescriptions/{id}/dispense/ — Cấp phát thuốc, trừ tồn kho."""
        prescription = self.get_object()
        if prescription.status == "dispensed":
            return Response({"detail": "Đơn thuốc đã được cấp phát rồi."}, status=400)

        errors = []
        for detail in prescription.details.select_related("medicine").all():
            batches = Inventory.objects.filter(
                medicine=detail.medicine,
                expiry_date__gt=timezone.now().date(),
                quantity__gt=0,
            ).order_by("expiry_date")  # FEFO

            remaining = detail.quantity
            for batch in batches:
                if remaining <= 0:
                    break
                deduct = min(batch.quantity, remaining)
                batch.quantity -= deduct
                batch.save()
                remaining -= deduct

            if remaining > 0:
                errors.append(
                    f"Không đủ tồn kho: {detail.medicine.name} (thiếu {remaining} {detail.medicine.unit})"
                )

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        prescription.status = "dispensed"
        prescription.dispensed_at = timezone.now()
        prescription.save()
        return Response(PrescriptionSerializer(prescription).data)

    @action(detail=True, methods=["post"])
    def add_medicine(self, request, pk=None):
        """POST /api/prescriptions/{id}/add_medicine/ — Thêm thuốc vào đơn."""
        prescription = self.get_object()
        serializer = PrescriptionDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(prescription=prescription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)