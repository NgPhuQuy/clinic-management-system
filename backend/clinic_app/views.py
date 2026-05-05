from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Count, Sum, Q
from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404

from .models import (
    Patient, Doctor, Specialty, Service,
    DoctorSchedule, Appointment, AppointmentService,
    MedicalRecord, TestResult,
    MedicineCategory, Medicine, Inventory, InventoryAlert,
    Prescription, PrescriptionDetail,
    Payment, Consultation, ChatMessage, Notification,
)
from .serializers import (
    RegisterSerializer, UserSerializer, ChangePasswordSerializer,
    PatientSerializer, DoctorSerializer,
    SpecialtySerializer, ServiceSerializer,
    DoctorScheduleSerializer,
    AppointmentSerializer, AppointmentCreateSerializer, AppointmentStatusSerializer,
    AppointmentServiceSerializer,
    MedicalRecordSerializer, TestResultSerializer,
    MedicineCategorySerializer, MedicineSerializer,
    InventorySerializer, InventoryAlertSerializer,
    PrescriptionSerializer, PrescriptionDetailSerializer,
    PaymentSerializer, PaymentInitSerializer,
    ConsultationSerializer, ChatMessageSerializer,
    NotificationSerializer,
)
from .permissions import (
    IsAdmin, IsDoctor, IsPatient, IsStaff,
    IsDoctorOrAdmin, IsOwnerOrAdmin, IsPatientOwnerOrDoctor,
)

User = get_user_model()


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Đăng ký tài khoản mới (patient hoặc doctor).
    Tự động tạo Patient/Doctor profile tương ứng.
    """
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Tự tạo profile
        if user.role == "patient":
            Patient.objects.create(user=user, full_name=user.username)
        elif user.role == "doctor":
            Doctor.objects.create(user=user,full_name=user.username,license_number=f"TEMP-{user.id}")

        # Trả về JWT ngay sau đăng ký
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/me/   — Lấy thông tin user hiện tại
    PATCH /api/auth/me/  — Cập nhật avatar
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """PUT /api/auth/change-password/"""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Đổi mật khẩu thành công."})


# ─────────────────────────────────────────────
# SPECIALTY & SERVICE
# ─────────────────────────────────────────────

class SpecialtyViewSet(viewsets.ModelViewSet):
    """
    GET    /api/specialties/         — Danh sách chuyên khoa
    POST   /api/specialties/         — Tạo mới (admin)
    GET    /api/specialties/{id}/    — Chi tiết
    PUT    /api/specialties/{id}/    — Cập nhật (admin)
    DELETE /api/specialties/{id}/    — Xóa (admin)
    """
    queryset = Specialty.objects.filter(is_active=True)
    serializer_class = SpecialtySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [AllowAny()]


class ServiceViewSet(viewsets.ModelViewSet):
    """GET /api/services/ — Danh sách dịch vụ, lọc theo chuyên khoa."""
    queryset = Service.objects.filter(is_active=True).select_related("specialty")
    serializer_class = ServiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["specialty"]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [AllowAny()]


# ─────────────────────────────────────────────
# PATIENT
# ─────────────────────────────────────────────

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
        if self.action == "list":
            return [IsStaff()]
        if self.action in ("retrieve", "update", "partial_update"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAdmin()]

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


# ─────────────────────────────────────────────
# DOCTOR
# ─────────────────────────────────────────────

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
        """GET /api/doctors/{id}/schedules/?date=2024-01-15 — Lịch khám còn trống."""
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


# ─────────────────────────────────────────────
# DOCTOR SCHEDULE
# ─────────────────────────────────────────────

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


# ─────────────────────────────────────────────
# APPOINTMENT
# ─────────────────────────────────────────────

class AppointmentViewSet(viewsets.ModelViewSet):
    """
    POST  /api/appointments/              — Bệnh nhân đặt lịch
    GET   /api/appointments/              — Danh sách
    GET   /api/appointments/{id}/         — Chi tiết
    PATCH /api/appointments/{id}/status/  — Cập nhật trạng thái
    """
    queryset = Appointment.objects.select_related(
        "patient", "doctor__specialty", "schedule"
    ).prefetch_related("appointment_services__service")
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "doctor", "patient"]
    ordering_fields = ["appointment_date", "created_at"]
    ordering = ["-appointment_date"]

    def get_serializer_class(self):
        if self.action == "create":
            return AppointmentCreateSerializer
        if self.action == "update_status":
            return AppointmentStatusSerializer
        return AppointmentSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsPatient()]
        if self.action in ("update_status",):
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.role == "patient":
            return qs.filter(patient__user=user)
        if user.role == "doctor":
            return qs.filter(doctor__user=user)
        return qs  # admin/staff xem tất cả

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        """PATCH /api/appointments/{id}/status/ — Đổi trạng thái lịch hẹn."""
        appointment = self.get_object()
        serializer = AppointmentStatusSerializer(
            appointment, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AppointmentSerializer(serializer.instance).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def add_service(self, request, pk=None):
        """POST /api/appointments/{id}/add_service/ — Thêm dịch vụ vào lịch hẹn."""
        appointment = self.get_object()
        serializer = AppointmentServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(appointment=appointment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────
# MEDICAL RECORD
# ─────────────────────────────────────────────

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


# ─────────────────────────────────────────────
# MEDICINE & INVENTORY
# ─────────────────────────────────────────────

class MedicineCategoryViewSet(viewsets.ModelViewSet):
    queryset = MedicineCategory.objects.all()
    serializer_class = MedicineCategorySerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]


class MedicineViewSet(viewsets.ModelViewSet):
    """
    GET  /api/medicines/         — Danh sách thuốc
    GET  /api/medicines/{id}/    — Chi tiết + tổng tồn kho
    """
    queryset = Medicine.objects.select_related("category").filter(is_active=True)
    serializer_class = MedicineSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "requires_prescription"]
    search_fields = ["name", "code", "generic_name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]


class InventoryViewSet(viewsets.ModelViewSet):
    """
    GET  /api/inventory/         — Xem tồn kho
    POST /api/inventory/         — Nhập kho (admin/staff)
    """
    queryset = Inventory.objects.select_related("medicine").all()
    serializer_class = InventorySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["medicine"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsStaff()]
        return [IsAuthenticated()]

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        """GET /api/inventory/low_stock/ — Danh sách thuốc sắp hết."""
        from django.db.models import F
        qs = self.get_queryset().filter(quantity__lte=F("warning_threshold"))
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def near_expiry(self, request):
        """GET /api/inventory/near_expiry/ — Thuốc sắp hết hạn (30 ngày)."""
        from datetime import timedelta
        threshold = timezone.now().date() + timedelta(days=30)
        qs = self.get_queryset().filter(expiry_date__lte=threshold, expiry_date__gt=timezone.now().date())
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class InventoryAlertViewSet(viewsets.ModelViewSet):
    """GET /api/inventory-alerts/ — Danh sách cảnh báo kho thuốc."""
    queryset = InventoryAlert.objects.select_related("medicine").order_by("-created_at")
    serializer_class = InventoryAlertSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["alert_type", "is_resolved"]

    def get_permissions(self):
        return [IsStaff()]

    @action(detail=True, methods=["patch"])
    def resolve(self, request, pk=None):
        """PATCH /api/inventory-alerts/{id}/resolve/ — Đánh dấu đã xử lý."""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        return Response({"detail": "Đã đánh dấu xử lý."})


# ─────────────────────────────────────────────
# PRESCRIPTION
# ─────────────────────────────────────────────

class PrescriptionViewSet(viewsets.ModelViewSet):
    """
    POST /api/prescriptions/       — Bác sĩ kê đơn
    GET  /api/prescriptions/{id}/  — Chi tiết đơn thuốc
    """
    queryset = Prescription.objects.prefetch_related("details__medicine").select_related(
        "patient", "doctor"
    ).all()
    serializer_class = PrescriptionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "patient", "doctor"]

    def get_permissions(self):
        if self.action == "create":
            return [IsDoctor()]
        if self.action in ("update", "partial_update"):
            return [IsDoctorOrAdmin()]
        return [IsAuthenticated()]

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

    @action(detail=True, methods=["post"], permission_classes=[IsStaff])
    def dispense(self, request, pk=None):
        """POST /api/prescriptions/{id}/dispense/ — Cấp phát thuốc, trừ tồn kho."""
        prescription = self.get_object()
        if prescription.status == "dispensed":
            return Response({"detail": "Đơn thuốc đã được cấp phát rồi."}, status=400)

        errors = []
        for detail in prescription.details.select_related("medicine").all():
            # Lấy lô thuốc còn hạn và đủ số lượng
            batches = Inventory.objects.filter(
                medicine=detail.medicine,
                expiry_date__gt=timezone.now().date(),
                quantity__gt=0,
            ).order_by("expiry_date")  # FEFO

            remaining = detail.quantity
            for batch in batches:
                if remaining <= 0:
                    break
                deduct = min(batch.quantity, remaining)
                batch.quantity -= deduct
                batch.save()
                remaining -= deduct

            if remaining > 0:
                errors.append(f"Không đủ tồn kho: {detail.medicine.name} (thiếu {remaining} {detail.medicine.unit})")

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        prescription.status = "dispensed"
        prescription.dispensed_at = timezone.now()
        prescription.save()
        return Response(PrescriptionSerializer(prescription).data)

    @action(detail=True, methods=["post"], permission_classes=[IsDoctor])
    def add_medicine(self, request, pk=None):
        """POST /api/prescriptions/{id}/add_medicine/ — Thêm thuốc vào đơn."""
        prescription = self.get_object()
        serializer = PrescriptionDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(prescription=prescription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────
# PAYMENT
# ─────────────────────────────────────────────

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/payments/       — Lịch sử thanh toán
    GET /api/payments/{id}/  — Chi tiết
    """
    queryset = Payment.objects.select_related("patient", "appointment").all()
    serializer_class = PaymentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "payment_method"]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.role == "patient":
            return qs.filter(patient__user=user)
        return qs

    def get_permissions(self):
        return [IsAuthenticated()]

    @action(detail=False, methods=["post"], permission_classes=[IsPatient])
    def init(self, request):
        """
        POST /api/payments/init/
        Khởi tạo thanh toán → trả về payment_url từ cổng TT.
        """
        serializer = PaymentInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)


        appointment = get_object_or_404(Appointment, pk=..., patient__user=request.user)

        # Tính tổng tiền từ dịch vụ + phí khám
        total = appointment.doctor.consultation_fee
        for svc in appointment.appointment_services.all():
            total += svc.get_subtotal()

        payment, _ = Payment.objects.get_or_create(
            appointment=appointment,
            defaults={
                "patient": request.user.patient_profile,
                "amount": total,
                "payment_method": serializer.validated_data["payment_method"],
                "status": "pending",
            },
        )

        # TODO: tích hợp thực tế MoMo/VNPay SDK ở đây
        payment_url = f"https://payment-gateway.example.com/pay?order={payment.id}&amount={total}"
        return Response({"payment_id": payment.id, "amount": total, "payment_url": payment_url})

    @action(detail=True, methods=["post"], permission_classes=[IsStaff])
    def confirm(self, request, pk=None):
        """POST /api/payments/{id}/confirm/ — Xác nhận thanh toán thành công (webhook/manual)."""
        payment = self.get_object()
        payment.status = "success"
        payment.paid_at = timezone.now()
        payment.transaction_id = request.data.get("transaction_id", "")
        payment.save()
        return Response(PaymentSerializer(payment).data)


# ─────────────────────────────────────────────
# CONSULTATION
# ─────────────────────────────────────────────

class ConsultationViewSet(viewsets.ModelViewSet):
    """
    GET  /api/consultations/{id}/         — Chi tiết phòng tư vấn
    POST /api/consultations/{id}/start/   — Bắt đầu phiên
    POST /api/consultations/{id}/end/     — Kết thúc phiên
    POST /api/consultations/{id}/message/ — Gửi tin nhắn chat
    """
    queryset = Consultation.objects.select_related("appointment").prefetch_related("messages")
    serializer_class = ConsultationSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """POST /api/consultations/{id}/start/ — Mở phòng tư vấn."""
        consultation = self.get_object()
        if consultation.status == "active":
            return Response({"detail": "Phiên đã đang diễn ra."}, status=400)

        # TODO: Tạo room trên Jitsi/Agora/WebRTC
        room_id = f"room_{consultation.id}_{int(timezone.now().timestamp())}"
        consultation.room_id = room_id
        consultation.room_url = f"https://meet.clinic.example.com/{room_id}"
        consultation.status = "active"
        consultation.started_at = timezone.now()
        consultation.save()
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        """POST /api/consultations/{id}/end/"""
        consultation = self.get_object()
        consultation.status = "ended"
        consultation.ended_at = timezone.now()
        consultation.save()
        return Response({"detail": "Phiên tư vấn đã kết thúc.", "duration_minutes": consultation.get_duration_minutes()})

    @action(detail=True, methods=["post"])
    def message(self, request, pk=None):
        """POST /api/consultations/{id}/message/ — Gửi tin nhắn."""
        consultation = self.get_object()
        serializer = ChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(consultation=consultation, sender=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────
# NOTIFICATION
# ─────────────────────────────────────────────

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/notifications/           — Thông báo của user hiện tại
    POST /api/notifications/read-all/  — Đánh dấu tất cả đã đọc
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")

    @action(detail=True, methods=["patch"])
    def read(self, request, pk=None):
        """PATCH /api/notifications/{id}/read/"""
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save()
        return Response({"detail": "Đã đánh dấu đã đọc."})

    @action(detail=False, methods=["post"])
    def read_all(self, request):
        """POST /api/notifications/read-all/"""
        self.get_queryset().filter(is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({"detail": "Đã đánh dấu tất cả đã đọc."})


# ─────────────────────────────────────────────
# ADMIN DASHBOARD / THỐNG KÊ
# ─────────────────────────────────────────────

class DashboardView(generics.GenericAPIView):
    """
    GET /api/admin/dashboard/
    Báo cáo tổng hợp cho admin.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        today = timezone.now().date()
        this_month = timezone.now().replace(day=1).date()

        # Thống kê bệnh nhân
        total_patients = Patient.objects.count()
        new_patients_month = Patient.objects.filter(user__created_at__date__gte=this_month).count()

        # Thống kê lịch hẹn
        appointments_today = Appointment.objects.filter(appointment_date__date=today).count()
        appointments_month = Appointment.objects.filter(appointment_date__date__gte=this_month).count()
        appointments_by_status = dict(
            Appointment.objects.values("status").annotate(count=Count("id")).values_list("status", "count")
        )

        # Doanh thu
        revenue_month = Payment.objects.filter(
            status="success", paid_at__date__gte=this_month
        ).aggregate(total=Sum("amount"))["total"] or 0

        revenue_today = Payment.objects.filter(
            status="success", paid_at__date=today
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Thống kê bệnh phổ biến (top 5 chẩn đoán)
        top_diagnoses = (
            MedicalRecord.objects
            .values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # Thống kê dịch vụ được dùng nhiều nhất
        top_services = (
            AppointmentService.objects
            .values("service__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # Cảnh báo kho thuốc
        pending_alerts = InventoryAlert.objects.filter(is_resolved=False).count()

        return Response({
            "patients": {
                "total": total_patients,
                "new_this_month": new_patients_month,
            },
            "appointments": {
                "today": appointments_today,
                "this_month": appointments_month,
                "by_status": appointments_by_status,
            },
            "revenue": {
                "today": revenue_today,
                "this_month": revenue_month,
            },
            "top_diagnoses": list(top_diagnoses),
            "top_services": list(top_services),
            "inventory_alerts": pending_alerts,
        })