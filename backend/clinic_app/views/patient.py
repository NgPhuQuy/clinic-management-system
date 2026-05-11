from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Patient
from ..serializers import PatientSerializer, AppointmentSerializer, MedicalRecordSerializer
from ..permissions import HasAdminScope, IsOwnerOrAdmin


class PatientViewSet(viewsets.ModelViewSet):
    """
    GET  /api/patients/        — Danh sách (admin/staff)
    GET  /api/patients/{id}/   — Chi tiết
    PATCH /api/patients/{id}/  — Cập nhật profile
    """
    queryset = Patient.objects.select_related("user").all()
    serializer_class = PatientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["full_name", "phone", "insurance_number"]

    def get_permissions(self):
        if self.action in ("retrieve", "update", "partial_update"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        if self.action in ("appointments", "medical_records"):
            return [IsAuthenticated()]
        return [HasAdminScope()]

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def appointments(self, request, pk=None):
        """GET /api/patients/{id}/appointments/ — Lịch sử khám bệnh."""
        patient = self.get_object()
        qs = patient.appointments.select_related("doctor__specialty").order_by("-appointment_date")
        serializer = AppointmentSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def medical_records(self, request, pk=None):
        """GET /api/patients/{id}/medical_records/"""
        patient = self.get_object()
        qs = patient.medical_records.prefetch_related("test_results").order_by("-created_at")
        serializer = MedicalRecordSerializer(qs, many=True)
        return Response(serializer.data)
