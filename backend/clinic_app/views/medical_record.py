from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import MedicalRecord
from ..serializers import MedicalRecordSerializer, TestResultSerializer
from ..permissions import (
    HasDoctorScope,
    HasDoctorOrAdminScope,
    HasDoctorOrStaffScope,
    IsAuthenticatedWithValidToken,
)


def _get_token_scopes(request) -> set:
    token = getattr(request, "auth", None)
    if token is None:
        return set()
    return set(token.scope.split())


class MedicalRecordViewSet(viewsets.ModelViewSet):
    """
    POST /api/medical-records/             — Bác sĩ tạo hồ sơ bệnh án       [doctor]
    GET  /api/medical-records/             — Danh sách                        [any auth]
    GET  /api/medical-records/{id}/        — Chi tiết                         [any auth]
    PUT  /api/medical-records/{id}/        — Cập nhật hồ sơ                   [doctor|admin]
    POST /api/medical-records/{id}/add_test_result/ — Nhập kết quả CLS        [doctor|staff]

    Phân quyền xem:
      - patient: chỉ thấy hồ sơ của mình
      - doctor:  chỉ thấy hồ sơ bệnh nhân mình điều trị
      - staff:   thấy tất cả (cần để nhập kết quả xét nghiệm)
      - admin:   thấy tất cả
    """
    queryset = MedicalRecord.objects.select_related(
        "patient", "doctor", "appointment"
    ).prefetch_related("test_results").all()
    serializer_class = MedicalRecordSerializer
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["patient", "doctor"]
    ordering         = ["-created_at"]

    def get_permissions(self):
        if self.action == "create":
            return [HasDoctorScope()]
        if self.action in ("update", "partial_update"):
            return [HasDoctorOrAdminScope()]
        if self.action == "add_test_result":
            return [HasDoctorOrStaffScope()] 
        return [IsAuthenticatedWithValidToken()]

    def get_queryset(self):
        user   = self.request.user
        qs     = super().get_queryset()
        scopes = _get_token_scopes(self.request)

        if "admin"   in scopes: return qs
        if "staff"   in scopes: return qs        
        if "doctor"  in scopes: return qs.filter(doctor__user=user)
        if "patient" in scopes: return qs.filter(patient__user=user)
        return qs.none()

    def perform_create(self, serializer):
        doctor = self.request.user.doctor_profile
        serializer.save(doctor=doctor)

    @action(detail=True, methods=["post"], url_path="add_test_result")
    def add_test_result(self, request, pk=None):
        record     = self.get_object()
        serializer = TestResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(medical_record=record, entered_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)