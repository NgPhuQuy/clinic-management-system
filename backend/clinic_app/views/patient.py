"""
clinic_app/views/patient.py

Endpoints:
  GET   /api/patients/              — Danh sách           [admin scope]
  GET   /api/patients/me/           — Profile của tôi     [patient scope]
  GET   /api/patients/{id}/         — Chi tiết            [owner or admin]
  PATCH /api/patients/{id}/         — Cập nhật profile    [owner or admin]
  GET   /api/patients/{id}/appointments/   — Lịch sử khám [owner or admin]
  GET   /api/patients/{id}/medical_records/ — Hồ sơ bệnh  [owner or admin]
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Patient
from ..serializers import PatientSerializer, AppointmentSerializer, MedicalRecordSerializer
from ..permissions import HasAdminScope, IsOwnerOrAdmin, IsAuthenticatedWithValidToken


class PatientViewSet(viewsets.ModelViewSet):
    """
    GET   /api/patients/        — Danh sách [admin]
    GET   /api/patients/me/     — Profile của tôi [patient]
    GET   /api/patients/{id}/   — Chi tiết  [owner or admin]
    PATCH /api/patients/{id}/   — Cập nhật  [owner or admin]
    """
    queryset = Patient.objects.select_related("user").all()
    serializer_class = PatientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["full_name", "phone", "insurance_number"]

    def get_permissions(self):
        if self.action == "me":
            return [IsAuthenticatedWithValidToken()]
        if self.action in ("retrieve", "update", "partial_update"):
            return [IsAuthenticatedWithValidToken(), IsOwnerOrAdmin()]
        if self.action in ("appointments", "medical_records"):
            return [IsAuthenticatedWithValidToken()]
        # list, create, destroy → admin only
        return [HasAdminScope()]

    @action(detail=False, methods=["get"])
    def me(self, request):
        """GET /api/patients/me/ — Lấy profile patient của user đang đăng nhập."""
        try:
            patient = request.user.patient_profile
            serializer = PatientSerializer(patient)
            return Response(serializer.data)
        except Patient.DoesNotExist:
            return Response(
                {"detail": "Chưa có hồ sơ bệnh nhân."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=["get"])
    def appointments(self, request, pk=None):
        """GET /api/patients/{id}/appointments/ — Lịch sử khám bệnh."""
        patient = self.get_object()
        qs = patient.appointments.select_related("doctor__specialty").order_by("-appointment_date")
        serializer = AppointmentSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def medical_records(self, request, pk=None):
        """GET /api/patients/{id}/medical_records/ — Hồ sơ bệnh án."""
        patient = self.get_object()
        qs = patient.medical_records.prefetch_related("test_results").order_by("-created_at")
        serializer = MedicalRecordSerializer(qs, many=True)
        return Response(serializer.data)