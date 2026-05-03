from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Doctor, DoctorSchedule
from ..serializers import DoctorSerializer, DoctorScheduleSerializer, AppointmentSerializer
from ..permissions import IsAdmin, IsOwnerOrAdmin, IsDoctorOrAdmin


class DoctorViewSet(viewsets.ModelViewSet):
    """
    GET  /api/doctors/        — Danh sách bác sĩ (public)
    GET  /api/doctors/{id}/   — Chi tiết
    """
    queryset = Doctor.objects.select_related("user", "specialty").filter(is_available=True)
    serializer_class = DoctorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["specialty", "is_available"]
    search_fields = ["full_name", "license_number"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("update", "partial_update"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAdmin()]

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def schedules(self, request, pk=None):
        """GET /api/doctors/{id}/schedules/?date=YYYY-MM-DD — Lịch khám còn trống."""
        doctor = self.get_object()
        date = request.query_params.get("date")
        qs = doctor.schedules.filter(is_available=True, date__gte=timezone.now().date())
        if date:
            qs = qs.filter(date=date)
        serializer = DoctorScheduleSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], permission_classes=[IsDoctorOrAdmin])
    def appointments(self, request, pk=None):
        """GET /api/doctors/{id}/appointments/ — Lịch hẹn của bác sĩ."""
        doctor = self.get_object()
        qs = doctor.appointments.select_related("patient").order_by("appointment_date")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = AppointmentSerializer(qs, many=True)
        return Response(serializer.data)


class DoctorScheduleViewSet(viewsets.ModelViewSet):
    """
    POST /api/schedules/       — Bác sĩ tạo lịch làm việc
    GET  /api/schedules/       — Xem lịch (lọc theo doctor, date)
    """
    queryset = DoctorSchedule.objects.select_related("doctor").all()
    serializer_class = DoctorScheduleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["doctor", "date", "is_available"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsDoctorOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        if self.request.user.role == "doctor":
            serializer.save(doctor=self.request.user.doctor_profile)
        else:
            serializer.save()
