from django.db import transaction
from django.db.models import Sum
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
from ..utils import get_token_scopes


class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.select_related(
        "medical_record__doctor__user",
        "medical_record__patient__user",
    ).prefetch_related("details__medicine").all()
    serializer_class  = PrescriptionSerializer
    filter_backends   = [DjangoFilterBackend]
    filterset_fields  = ["status", "medical_record"]

    def get_permissions(self):
        if self.action == "create":
            return [HasDoctorScope()]
        if self.action in ("update", "partial_update"):
            return [HasDoctorOrAdminScope()]
        if self.action == "add_medicine":
            return [HasDoctorScope()]
        if self.action == "dispense":
            return [HasStaffOrAdminScope()]
        return [IsAuthenticatedWithValidToken()]

    def get_queryset(self):
        user   = self.request.user
        qs     = super().get_queryset()
        scopes = get_token_scopes(self.request)

        if "admin"   in scopes: return qs
        if "staff"   in scopes: return qs
        if "doctor"  in scopes: return qs.filter(medical_record__doctor__user=user)
        if "patient" in scopes: return qs.filter(medical_record__patient__user=user)
        return qs.none()

    @action(detail=True, methods=["post"])
    def dispense(self, request, pk=None):
        prescription = self.get_object()

        if prescription.status == Prescription.Status.DISPENSED:
            return Response(
                {"detail": "Đơn thuốc đã được cấp phát rồi."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if prescription.status == Prescription.Status.CANCELLED:
            return Response(
                {"detail": "Đơn thuốc đã bị hủy, không thể cấp phát."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shortage_errors = []
        for detail in prescription.details.select_related("medicine").all():
            available = (
                Inventory.objects
                .filter(
                    medicine=detail.medicine,
                    expiry_date__gt=timezone.now().date(),
                    quantity__gt=0,
                )
                .aggregate(total=Sum("quantity"))
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

        with transaction.atomic():
            for detail in prescription.details.select_related("medicine").all():
                remaining = detail.quantity
                batches = (
                    Inventory.objects
                    .filter(
                        medicine=detail.medicine,
                        expiry_date__gt=timezone.now().date(),
                        quantity__gt=0,
                    )
                    .order_by("expiry_date")
                )

                for batch in batches:
                    if remaining <= 0:
                        break
                    deduct         = min(batch.quantity, remaining)
                    batch.quantity -= deduct
                    batch.save(update_fields=["quantity"])
                    remaining      -= deduct

            prescription.status       = Prescription.Status.DISPENSED
            prescription.dispensed_at = timezone.now()
            prescription.dispensed_by = request.user.staff_profile if hasattr(request.user, "staff_profile") else None
            prescription.save()

        return Response(PrescriptionSerializer(prescription).data)

    @action(detail=True, methods=["post"])
    def add_medicine(self, request, pk=None):
        prescription = self.get_object()
        if prescription.status != Prescription.Status.PENDING:
            return Response(
                {"detail": "Chỉ có thể thêm thuốc vào đơn đang chờ cấp phát."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = PrescriptionDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(prescription=prescription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
