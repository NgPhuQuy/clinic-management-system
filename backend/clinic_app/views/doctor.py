from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Doctor, DoctorSchedule
from ..serializers import DoctorSerializer, DoctorScheduleSerializer, AppointmentSerializer
from ..permissions import HasAdminScope, IsOwnerOrAdmin, HasDoctorOrAdminScope, IsAuthenticatedWithValidToken


class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.select_related("user", "specialty").filter(is_available=True)
    serializer_class = DoctorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["specialty", "is_available"]
    search_fields = ["user__first_name", "user__last_name", "license_number"]

    def get_permissions(self):
        if self.action in ("list", "retrieve", "schedules"):
            return [AllowAny()]
        if self.action in ("update", "partial_update"):
            return [IsAuthenticatedWithValidToken(), IsOwnerOrAdmin()]
        if self.action == "appointments":
            return [HasDoctorOrAdminScope()]
        return [HasAdminScope()]

    @action(detail=True, methods=["get"])
    def schedules(self, request, pk=None):
        doctor = self.get_object()
        date = request.query_params.get("date")
        qs = doctor.schedules.filter(is_available=True, date__gte=timezone.now().date())
        if date:
            qs = qs.filter(date=date)
        serializer = DoctorScheduleSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def appointments(self, request, pk=None):
        """GET /api/doctors/{id}/appointments/"""
        doctor = self.get_object()
        qs = doctor.appointments.select_related("patient").order_by("appointment_date")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = AppointmentSerializer(qs, many=True)
        return Response(serializer.data)


class DoctorScheduleViewSet(viewsets.ModelViewSet):
    queryset = DoctorSchedule.objects.select_related("doctor__user").annotate(
        booked_count=Count("appointments", filter=~Q(appointments__status="cancelled"))
    )
    serializer_class = DoctorScheduleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["doctor", "date", "is_available"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [HasDoctorOrAdminScope()]
        return [IsAuthenticatedWithValidToken()]

    def perform_create(self, serializer):
        if self.request.user.role == "doctor":
            serializer.save(doctor=self.request.user.doctor_profile)
        else:
            serializer.save()