"""
clinic_app/views/staff_doctor.py

Dashboard và các endpoint bổ sung cho bác sĩ và nhân viên y tế.

Endpoints mới:
  GET  /api/doctor/dashboard/          — Dashboard bác sĩ
  GET  /api/staff/dashboard/           — Dashboard nhân viên y tế
  GET  /api/staff/patients/            — Nhân viên xem danh sách bệnh nhân
  GET  /api/staff/patients/{id}/       — Nhân viên xem chi tiết bệnh nhân

Roles:
  doctor  → quản lý lịch hẹn, hồ sơ bệnh án, kê đơn, tư vấn
  staff   → xác nhận lịch, nhập kết quả CLS, cấp thuốc, thu tiền
"""

from datetime import timedelta

from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from ..models import (
    Appointment, MedicalRecord, Prescription, Patient,
    Payment, Inventory, InventoryAlert, DoctorSchedule,
)
from ..serializers import (
    AppointmentSerializer, MedicalRecordSerializer,
    PrescriptionSerializer, PatientSerializer,
    InventorySerializer, InventoryAlertSerializer,
)
from ..permissions import (
    HasDoctorOrAdminScope, HasStaffOrAdminScope,
    IsAuthenticatedWithValidToken,
)


def _get_token_scopes(request) -> set:
    token = getattr(request, "auth", None)
    if token is None:
        return set()
    return set(token.scope.split())


# ─────────────────────────────────────────────
# Doctor Dashboard
# ─────────────────────────────────────────────

class DoctorDashboardView(APIView):
    """
    GET /api/doctor/dashboard/
    Dashboard tổng hợp cho bác sĩ đang đăng nhập.
    """
    permission_classes = [HasDoctorOrAdminScope]

    def get(self, request):
        user = request.user
        scopes = _get_token_scopes(request)

        # Admin xem tổng quát, doctor xem của mình
        if "admin" in scopes:
            doctor_filter = {}
        else:
            try:
                doctor = user.doctor_profile
            except Exception:
                return Response({"detail": "Không tìm thấy hồ sơ bác sĩ."}, status=400)
            doctor_filter = {"doctor": doctor}

        today = timezone.now().date()
        this_month = timezone.now().replace(day=1).date()

        # Lịch hẹn hôm nay
        appointments_today = Appointment.objects.filter(
            appointment_date__date=today, **doctor_filter
        ).count()

        # Lịch hẹn đang chờ
        appointments_pending = Appointment.objects.filter(
            status="pending", **doctor_filter
        ).count()

        # Lịch hẹn đang khám
        appointments_in_progress = Appointment.objects.filter(
            status="in_progress", **doctor_filter
        ).count()

        # Lịch hẹn trong tháng
        appointments_month = Appointment.objects.filter(
            appointment_date__date__gte=this_month, **doctor_filter
        ).count()

        # Hồ sơ bệnh án trong tháng
        records_month = MedicalRecord.objects.filter(
            created_at__date__gte=this_month, **doctor_filter
        ).count()

        # Đơn thuốc đang chờ cấp phát
        prescriptions_pending = Prescription.objects.filter(
            status="pending", **doctor_filter
        ).count()

        # Lịch hẹn sắp tới (7 ngày)
        upcoming = Appointment.objects.filter(
            appointment_date__date__gte=today,
            appointment_date__date__lte=today + timedelta(days=7),
            status__in=["pending", "confirmed"],
            **doctor_filter,
        ).select_related("patient", "doctor__specialty", "schedule").order_by(
            "appointment_date"
        )[:10]

        return Response({
            "appointments": {
                "today": appointments_today,
                "pending": appointments_pending,
                "in_progress": appointments_in_progress,
                "this_month": appointments_month,
            },
            "medical_records": {
                "this_month": records_month,
            },
            "prescriptions": {
                "pending": prescriptions_pending,
            },
            "upcoming_appointments": AppointmentSerializer(upcoming, many=True).data,
        })


# ─────────────────────────────────────────────
# Staff Dashboard
# ─────────────────────────────────────────────

class StaffDashboardView(APIView):
    """
    GET /api/staff/dashboard/
    Dashboard tổng hợp cho nhân viên y tế.
    """
    permission_classes = [HasStaffOrAdminScope]

    def get(self, request):
        today = timezone.now().date()
        this_month = timezone.now().replace(day=1).date()

        # Lịch hẹn hôm nay
        appointments_today = Appointment.objects.filter(
            appointment_date__date=today
        ).count()

        # Lịch hẹn chờ xác nhận
        appointments_pending = Appointment.objects.filter(
            status="pending"
        ).count()

        # Đơn thuốc chờ cấp phát
        prescriptions_pending = Prescription.objects.filter(
            status="pending"
        ).count()

        # Thanh toán chờ xác nhận (tiền mặt)
        payments_pending_cash = Payment.objects.filter(
            status="pending",
            payment_method="cash",
        ).count()

        # Cảnh báo kho thuốc chưa xử lý
        inventory_alerts = InventoryAlert.objects.filter(is_resolved=False).count()

        # Doanh thu hôm nay
        revenue_today = Payment.objects.filter(
            status="success",
            paid_at__date=today,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Doanh thu tháng này
        revenue_month = Payment.objects.filter(
            status="success",
            paid_at__date__gte=this_month,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Lịch hẹn cần xử lý hôm nay
        todays_appointments = Appointment.objects.filter(
            appointment_date__date=today,
        ).select_related("patient", "doctor__specialty").order_by("appointment_date")[:20]

        # Thuốc sắp hết tồn kho
        low_stock_count = Inventory.objects.filter(
            quantity__lte=10
        ).count()

        # Thuốc sắp hết hạn (30 ngày)
        near_expiry_count = Inventory.objects.filter(
            expiry_date__lte=today + timedelta(days=30),
            expiry_date__gt=today,
        ).count()

        return Response({
            "appointments": {
                "today": appointments_today,
                "pending": appointments_pending,
            },
            "prescriptions": {
                "pending": prescriptions_pending,
            },
            "payments": {
                "pending_cash": payments_pending_cash,
                "revenue_today": revenue_today,
                "revenue_month": revenue_month,
            },
            "inventory": {
                "alerts": inventory_alerts,
                "low_stock": low_stock_count,
                "near_expiry": near_expiry_count,
            },
            "todays_appointments": AppointmentSerializer(todays_appointments, many=True).data,
        })


# ─────────────────────────────────────────────
# Staff: Patient lookup (nhân viên tìm bệnh nhân)
# ─────────────────────────────────────────────

class StaffPatientListView(generics.ListAPIView):
    """
    GET /api/staff/patients/?search=...
    Nhân viên y tế tìm kiếm bệnh nhân.
    """
    permission_classes = [HasStaffOrAdminScope]
    serializer_class = PatientSerializer
    queryset = Patient.objects.select_related("user").all()
    filter_backends = [filters.SearchFilter]
    search_fields = ["full_name", "phone", "insurance_number", "user__email"]


class StaffPatientDetailView(generics.RetrieveAPIView):
    """
    GET /api/staff/patients/{id}/
    Nhân viên xem chi tiết bệnh nhân (cho tiếp nhận, cấp thuốc, thu tiền).
    """
    permission_classes = [HasStaffOrAdminScope]
    serializer_class = PatientSerializer
    queryset = Patient.objects.select_related("user").all()


# ─────────────────────────────────────────────
# Staff: Payment confirmation (thu tiền mặt)
# ─────────────────────────────────────────────

class StaffPaymentListView(generics.ListAPIView):
    """
    GET /api/staff/payments/?status=pending&method=cash
    Nhân viên thu ngân xem danh sách thanh toán.
    """
    permission_classes = [HasStaffOrAdminScope]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "payment_method"]

    def get_queryset(self):
        from ..models import Payment
        from ..serializers import PaymentSerializer
        return Payment.objects.select_related("patient", "appointment").all()

    def get_serializer_class(self):
        from ..serializers import PaymentSerializer
        return PaymentSerializer


# ─────────────────────────────────────────────
# Doctor: My Schedule management
# ─────────────────────────────────────────────

class DoctorMyScheduleView(APIView):
    """
    GET /api/doctor/my-schedules/
    Bác sĩ xem lịch làm việc của mình.
    """
    permission_classes = [HasDoctorOrAdminScope]

    def get(self, request):
        try:
            doctor = request.user.doctor_profile
        except Exception:
            return Response({"detail": "Không tìm thấy hồ sơ bác sĩ."}, status=400)

        from ..serializers import DoctorScheduleSerializer
        qs = DoctorSchedule.objects.filter(doctor=doctor).order_by("date", "start_time")

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        serializer = DoctorScheduleSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


# ─────────────────────────────────────────────
# Doctor: Today appointments
# ─────────────────────────────────────────────

class DoctorTodayAppointmentsView(APIView):
    """
    GET /api/doctor/today-appointments/
    Bác sĩ xem danh sách bệnh nhân hôm nay.
    """
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
        ).select_related("patient", "schedule").order_by("appointment_date")

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response(AppointmentSerializer(qs, many=True).data)


# ─────────────────────────────────────────────
# Staff: Inventory management
# ─────────────────────────────────────────────

class StaffInventoryAlertView(APIView):
    """
    GET /api/staff/inventory-alerts/
    Nhân viên xem tất cả cảnh báo kho thuốc chưa xử lý.
    """
    permission_classes = [HasStaffOrAdminScope]

    def get(self, request):
        qs = InventoryAlert.objects.filter(
            is_resolved=False
        ).select_related("medicine", "inventory").order_by("-created_at")

        return Response(InventoryAlertSerializer(qs, many=True).data)