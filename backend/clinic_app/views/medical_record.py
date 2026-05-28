from rest_framework import viewsets, filters, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import MedicalRecord, TestResult
from ..serializers import MedicalRecordSerializer, TestResultSerializer
from ..permissions import (
    HasDoctorScope,
    HasDoctorOrAdminScope,
    HasDoctorOrStaffScope,
    IsAuthenticatedWithValidToken,
)
from ..utils import get_token_scopes


class MedicalRecordViewSet(viewsets.ModelViewSet):
    queryset = MedicalRecord.objects.select_related(
        "patient", "doctor", "appointment"
    ).prefetch_related("test_results").all()
    serializer_class = MedicalRecordSerializer
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["patient", "doctor", "appointment"]
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
        scopes = get_token_scopes(self.request)

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
        scopes     = get_token_scopes(request)
        entered_by = getattr(request.user, "staff_profile", None) if "staff" in scopes else None
        serializer.save(medical_record=record, entered_by=entered_by)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TestResultViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = TestResult.objects.select_related(
        "medical_record__patient__user"
    ).all()
    serializer_class = TestResultSerializer
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "medical_record"]
    ordering         = ["-test_date"]

    def get_permissions(self):
        if self.action in ("update", "partial_update"):
            return [HasDoctorOrStaffScope()]
        return [IsAuthenticatedWithValidToken()]

    def get_queryset(self):
        qs     = super().get_queryset()
        user   = self.request.user
        scopes = get_token_scopes(self.request)
        if "admin"   in scopes: return qs
        if "staff"   in scopes: return qs
        if "doctor"  in scopes: return qs.filter(medical_record__doctor__user=user)
        if "patient" in scopes: return qs.filter(medical_record__patient__user=user)
        return qs.none()

    def perform_update(self, serializer):
        scopes     = get_token_scopes(self.request)
        entered_by = getattr(self.request.user, "staff_profile", None) if "staff" in scopes else None
        if entered_by:
            serializer.save(entered_by=entered_by)
        else:
            serializer.save()
