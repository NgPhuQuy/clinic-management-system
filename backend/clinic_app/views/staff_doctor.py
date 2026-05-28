from datetime import timedelta

from django.db.models import Sum, Q, F
from django.utils import timezone
from rest_framework import generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from ..models import (
    Appointment, MedicalRecord, Prescription, Patient,
    Payment, Inventory, InventoryAlert, DoctorSchedule, Medicine,
)
from ..serializers import (
    AppointmentSerializer, PatientSerializer,
    InventoryAlertSerializer, PaymentSerializer, DoctorScheduleSerializer,
)
from ..permissions import (
    HasDoctorOrAdminScope, HasStaffOrAdminScope,
    IsAuthenticatedWithValidToken,
)
from ..utils import get_token_scopes


class DoctorDashboardView(APIView):
    permission_classes = [HasDoctorOrAdminScope]

    def get(self, request):
        scopes = get_token_scopes(request)

        if "admin" in scopes:
            doctor_filter = {}
        else:
            try:
                doctor = request.user.doctor_profile
            except Exception:
                return Response({"detail": "Không tìm thấy hồ sơ bác sĩ."}, status=400)
            doctor_filter = {"doctor": doctor}

        today      = timezone.now().date()
        this_month = timezone.now().replace(day=1).date()

        appointments_today       = Appointment.objects.filter(appointment_date__date=today, **doctor_filter).count()
        appointments_pending     = Appointment.objects.filter(status="pending", **doctor_filter).count()
        appointments_in_progress = Appointment.objects.filter(status="in_progress", **doctor_filter).count()
        appointments_month       = Appointment.objects.filter(appointment_date__date__gte=this_month, **doctor_filter).count()
        records_month            = MedicalRecord.objects.filter(created_at__date__gte=this_month, **doctor_filter).count()
        prescriptions_pending    = Prescription.objects.filter(status="pending", **{"medical_record__" + k: v for k, v in doctor_filter.items()}).count()

        upcoming = Appointment.objects.filter(
            appointment_date__date__gte=today,
            appointment_date__date__lte=today + timedelta(days=7),
            status__in=["pending", "confirmed"],
            **doctor_filter,
        ).select_related(
            "patient__user", "doctor__specialty", "doctor__user", "schedule", "invoice",
        ).prefetch_related("appointment_services__service").order_by("appointment_date")[:10]

        return Response({
            "appointments": {
                "today":       appointments_today,
                "pending":     appointments_pending,
                "in_progress": appointments_in_progress,
                "this_month":  appointments_month,
            },
            "medical_records":       {"this_month": records_month},
            "prescriptions":         {"pending": prescriptions_pending},
            "upcoming_appointments": AppointmentSerializer(upcoming, many=True).data,
        })


class StaffDashboardView(APIView):
    permission_classes = [HasStaffOrAdminScope]

    def get(self, request):
        today = timezone.now().date()

        appointments_today    = Appointment.objects.filter(appointment_date__date=today).count()
        appointments_pending  = Appointment.objects.filter(status="pending").count()
        prescriptions_pending = Prescription.objects.filter(status="pending").count()
        inventory_alerts      = InventoryAlert.objects.filter(is_resolved=False).count()

        low_stock_count = (
            Medicine.objects
            .filter(is_active=True)
            .annotate(
                total_valid=Sum(
                    "inventory_batches__quantity",
                    filter=Q(inventory_batches__expiry_date__gt=today),
                )
            )
            .filter(Q(total_valid__lte=F("warning_threshold")) | Q(total_valid__isnull=True))
            .count()
        )

        near_expiry_count = Inventory.objects.filter(
            expiry_date__lte=today + timedelta(days=30),
            expiry_date__gt=today,
        ).count()

        todays_appointments = Appointment.objects.filter(
            appointment_date__date=today,
        ).select_related(
            "patient__user", "doctor__specialty", "doctor__user", "schedule", "invoice",
        ).prefetch_related("appointment_services__service").order_by("appointment_date")[:20]

        return Response({
            "appointments": {
                "today":   appointments_today,
                "pending": appointments_pending,
            },
            "prescriptions": {"pending": prescriptions_pending},
            "inventory": {
                "alerts":      inventory_alerts,
                "low_stock":   low_stock_count,
                "near_expiry": near_expiry_count,
            },
            "todays_appointments": AppointmentSerializer(todays_appointments, many=True).data,
        })


class StaffPatientListView(generics.ListAPIView):
    permission_classes = [HasStaffOrAdminScope]
    serializer_class   = PatientSerializer
    queryset           = Patient.objects.select_related("user").all()
    filter_backends    = [filters.SearchFilter]
    search_fields      = ["user__first_name", "user__last_name", "phone", "insurance_number", "user__email"]


class StaffPatientDetailView(generics.RetrieveAPIView):
    permission_classes = [HasStaffOrAdminScope]
    serializer_class   = PatientSerializer
    queryset           = Patient.objects.select_related("user").all()


class StaffPaymentListView(generics.ListAPIView):
    permission_classes = [HasStaffOrAdminScope]
    serializer_class   = PaymentSerializer
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["status", "payment_method"]

    def get_queryset(self):
        return Payment.objects.select_related(
            "invoice__appointment__patient__user",
            "invoice__appointment__doctor__user",
        ).all()


class DoctorMyScheduleView(APIView):
    permission_classes = [HasDoctorOrAdminScope]

    def get(self, request):
        try:
            doctor = request.user.doctor_profile
        except Exception:
            return Response({"detail": "Không tìm thấy hồ sơ bác sĩ."}, status=400)

        qs = DoctorSchedule.objects.filter(doctor=doctor).order_by("date", "start_time")

        date_from = request.query_params.get("date_from")
        date_to   = request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return Response(DoctorScheduleSerializer(qs, many=True, context={"request": request}).data)


class DoctorTodayAppointmentsView(APIView):
    permission_classes = [HasDoctorOrAdminScope]

    def get(self, request):
        try:
            doctor = request.user.doctor_profile
        except Exception:
            return Response({"detail": "Không tìm thấy hồ sơ bác sĩ."}, status=400)

        today = timezone.now().date()
        qs = Appointment.objects.filter(
            doctor=doctor,
            appointment_date__date=today,
        ).select_related(
            "patient__user", "doctor__specialty", "doctor__user", "schedule", "invoice",
        ).prefetch_related("appointment_services__service").order_by("appointment_date")

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response(AppointmentSerializer(qs, many=True).data)


class StaffInventoryAlertView(APIView):
    permission_classes = [HasStaffOrAdminScope]

    def get(self, request):
        qs = InventoryAlert.objects.filter(
            is_resolved=False
        ).select_related("medicine", "inventory").order_by("-created_at")
        return Response(InventoryAlertSerializer(qs, many=True).data)
