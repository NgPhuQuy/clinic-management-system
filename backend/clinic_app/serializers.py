from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Patient, Doctor, Specialty, Service,
    DoctorSchedule, Appointment, AppointmentService,
    MedicalRecord, TestResult,
    MedicineCategory, Medicine, Inventory, InventoryAlert,
    Prescription, PrescriptionDetail,
    Payment, Consultation, ChatMessage, Notification,
)

User = get_user_model()


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "username", "password", "password_confirm", "role")

    def validate(self, data):
        if data["password"] != data.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Mật khẩu không khớp."})
        allowed_roles = ("patient", "doctor")
        if data.get("role") not in allowed_roles:
            raise serializers.ValidationError({"role": "Chỉ được đăng ký role patient hoặc doctor."})
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "username", "role", "avatar", "is_active", "created_at")
        read_only_fields = ("id", "created_at", "is_active")


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mật khẩu cũ không đúng.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


# ─────────────────────────────────────────────
# SPECIALTY & SERVICE
# ─────────────────────────────────────────────

class SpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)

    class Meta:
        model = Service
        fields = ("id", "specialty", "specialty_name", "name", "description", "price", "is_active")


# ─────────────────────────────────────────────
# PATIENT
# ─────────────────────────────────────────────

class PatientSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Patient
        fields = (
            "id", "user", "email", "full_name", "date_of_birth",
            "gender", "phone", "address", "insurance_number",
            "blood_type", "emergency_contact",
        )
        read_only_fields = ("id", "user")


class PatientSummarySerializer(serializers.ModelSerializer):
    """Dùng trong nested contexts (appointment, record…)."""

    class Meta:
        model = Patient
        fields = ("id", "full_name", "phone", "date_of_birth")


# ─────────────────────────────────────────────
# DOCTOR
# ─────────────────────────────────────────────

class DoctorSerializer(serializers.ModelSerializer):
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Doctor
        fields = (
            "id", "user", "email", "specialty", "specialty_name",
            "full_name", "license_number", "experience_years",
            "consultation_fee", "bio", "is_available",
        )
        read_only_fields = ("id", "user")


class DoctorSummarySerializer(serializers.ModelSerializer):
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)

    class Meta:
        model = Doctor
        fields = ("id", "full_name", "specialty_name", "consultation_fee")


# ─────────────────────────────────────────────
# DOCTOR SCHEDULE
# ─────────────────────────────────────────────

class DoctorScheduleSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    booked_count = serializers.SerializerMethodField()

    class Meta:
        model = DoctorSchedule
        fields = (
            "id", "doctor", "doctor_name", "date",
            "start_time", "end_time", "max_appointments",
            "booked_count", "is_available",
        )
        read_only_fields = ("id",)

    def get_booked_count(self, obj):
        return obj.appointments.exclude(status="cancelled").count()

    def validate(self, data):
        if data.get("start_time") and data.get("end_time"):
            if data["start_time"] >= data["end_time"]:
                raise serializers.ValidationError("Giờ bắt đầu phải trước giờ kết thúc.")
        return data


# ─────────────────────────────────────────────
# APPOINTMENT
# ─────────────────────────────────────────────

class AppointmentServiceSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = AppointmentService
        fields = ("id", "service", "service_name", "quantity", "price_at_time")
        read_only_fields = ("price_at_time",)

    def create(self, validated_data):
        service = validated_data["service"]
        validated_data["price_at_time"] = service.price
        return super().create(validated_data)


class AppointmentSerializer(serializers.ModelSerializer):
    patient_info = PatientSummarySerializer(source="patient", read_only=True)
    doctor_info = DoctorSummarySerializer(source="doctor", read_only=True)
    appointment_services = AppointmentServiceSerializer(many=True, read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id", "patient", "patient_info", "doctor", "doctor_info",
            "schedule", "appointment_date", "status", "reason", "notes",
            "appointment_services", "created_at", "updated_at",
        )
        read_only_fields = ("id", "status", "created_at", "updated_at")

    def validate_appointment_date(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Thời gian hẹn phải là trong tương lai.")
        return value


class AppointmentCreateSerializer(serializers.ModelSerializer):
    services = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Service.objects.filter(is_active=True), write_only=True, required=False
    )

    class Meta:
        model = Appointment
        fields = ("doctor", "schedule", "appointment_date", "reason", "notes", "services")

    def create(self, validated_data):
        services = validated_data.pop("services", [])
        patient = self.context["request"].user.patient_profile
        appointment = Appointment.objects.create(patient=patient, **validated_data)
        for service in services:
            AppointmentService.objects.create(
                appointment=appointment,
                service=service,
                quantity=1,
                price_at_time=service.price,
            )
        return appointment


class AppointmentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ("status",)

    def validate_status(self, value):
        instance = self.instance
        user = self.context["request"].user
        allowed = {
            "patient": {
                "pending": ["cancelled"],
                "confirmed": ["cancelled"],
            },
            "doctor": {
                "pending": ["confirmed", "cancelled"],
                "confirmed": ["completed", "no_show"],
            },
            "staff": {
                "pending": ["confirmed", "cancelled"],
                "confirmed": ["completed", "no_show"],
            },
            "admin": None,  # unrestricted
        }
        role_rules = allowed.get(user.role)
        if role_rules is not None:
            permitted = role_rules.get(instance.status, [])
            if value not in permitted:
                raise serializers.ValidationError(
                    f"Không thể chuyển từ '{instance.status}' → '{value}'."
                )
        return value


# ─────────────────────────────────────────────
# MEDICAL RECORD
# ─────────────────────────────────────────────

class TestResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestResult
        fields = "__all__"
        read_only_fields = ("id", "medical_record")


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_info = PatientSummarySerializer(source="patient", read_only=True)
    doctor_info = DoctorSummarySerializer(source="doctor", read_only=True)
    test_results = TestResultSerializer(many=True, read_only=True)

    class Meta:
        model = MedicalRecord
        fields = (
            "id", "patient", "patient_info", "doctor", "doctor_info",
            "appointment", "diagnosis", "symptoms", "treatment_notes",
            "follow_up_date", "test_results", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


# ─────────────────────────────────────────────
# MEDICINE & INVENTORY
# ─────────────────────────────────────────────

class MedicineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineCategory
        fields = "__all__"


class MedicineSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Medicine
        fields = (
            "id", "category", "category_name", "name", "code",
            "generic_name", "unit", "price", "requires_prescription",
            "description", "is_active", "total_stock",
        )

    def get_total_stock(self, obj):
        from django.utils import timezone
        return obj.inventory_batches.filter(
            expiry_date__gt=timezone.now().date()
        ).aggregate(
            total=models.Sum("quantity")
        )["total"] or 0


class InventorySerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_near_expiry = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = (
            "id", "medicine", "medicine_name", "batch_number",
            "quantity", "expiry_date", "import_date", "import_price",
            "supplier", "warning_threshold", "is_low_stock", "is_near_expiry",
        )

    def get_is_near_expiry(self, obj):
        return obj.is_near_expiry(days=30)


class InventoryAlertSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)

    class Meta:
        model = InventoryAlert
        fields = (
            "id", "medicine", "medicine_name", "inventory",
            "alert_type", "message", "is_resolved", "created_at", "resolved_at",
        )
        read_only_fields = ("id", "created_at")


# ─────────────────────────────────────────────
# PRESCRIPTION
# ─────────────────────────────────────────────

class PrescriptionDetailSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    medicine_unit = serializers.CharField(source="medicine.unit", read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = PrescriptionDetail
        fields = (
            "id", "medicine", "medicine_name", "medicine_unit",
            "quantity", "dosage", "frequency", "duration_days",
            "instructions", "price_at_time", "subtotal",
        )
        read_only_fields = ("price_at_time",)

    def get_subtotal(self, obj):
        return obj.get_subtotal()

    def create(self, validated_data):
        validated_data["price_at_time"] = validated_data["medicine"].price
        return super().create(validated_data)


class PrescriptionSerializer(serializers.ModelSerializer):
    details = PrescriptionDetailSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)

    class Meta:
        model = Prescription
        fields = (
            "id", "medical_record", "doctor", "doctor_name",
            "patient", "patient_name", "status", "notes",
            "details", "total_amount", "created_at", "dispensed_at",
        )
        read_only_fields = ("id", "patient", "doctor", "created_at")

    def get_total_amount(self, obj):
        return sum(d.get_subtotal() for d in obj.details.all())


# ─────────────────────────────────────────────
# PAYMENT
# ─────────────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id", "appointment", "patient", "patient_name",
            "amount", "payment_method", "status",
            "transaction_id", "paid_at", "created_at",
        )
        read_only_fields = ("id", "status", "transaction_id", "paid_at", "created_at")


class PaymentInitSerializer(serializers.Serializer):
    """Dùng để khởi tạo thanh toán → trả về payment_url."""
    appointment_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices)


# ─────────────────────────────────────────────
# CONSULTATION
# ─────────────────────────────────────────────

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ("id", "consultation", "sender", "sender_name", "message", "attachment", "sent_at", "is_read")
        read_only_fields = ("id", "sender", "sent_at")


class ConsultationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = (
            "id", "appointment", "type", "room_url", "room_id",
            "status", "started_at", "ended_at", "duration_minutes", "messages",
        )
        read_only_fields = ("id", "room_url", "room_id")

    def get_duration_minutes(self, obj):
        return obj.get_duration_minutes()


# ─────────────────────────────────────────────
# NOTIFICATION
# ─────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "title", "message", "type", "is_read", "related_object_id", "created_at", "read_at")
        read_only_fields = ("id", "created_at")
