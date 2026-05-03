from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import MedicalRecord
from ..serializers import MedicalRecordSerializer, TestResultSerializer
from ..permissions import IsDoctor, IsDoctorOrAdmin, IsPatientOwnerOrDoctor


class MedicalRecordViewSet(viewsets.ModelViewSet):
    """
    POST /api/medical-records/       — Bác sĩ tạo hồ sơ bệnh án
    GET  /api/medical-records/       — Danh sách
    GET  /api/medical-records/{id}/  — Chi tiết
    """
    queryset = MedicalRecord.objects.select_related(
        "patient", "doctor", "appointment"
    ).prefetch_related("test_results").all()
    serializer_class = MedicalRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["patient", "doctor"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action == "create":
            return [IsDoctor()]
        if self.action in ("update", "partial_update"):
            return [IsDoctorOrAdmin()]
        return [IsAuthenticated(), IsPatientOwnerOrDoctor()]

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

    @action(detail=True, methods=["post"], permission_classes=[IsDoctor])
    def add_test_result(self, request, pk=None):
        """POST /api/medical-records/{id}/add_test_result/"""
        record = self.get_object()
        serializer = TestResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(medical_record=record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
