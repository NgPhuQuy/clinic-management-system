from django.utils import timezone
from rest_framework import serializers
from ..models import Appointment, AppointmentService, Service, Payment
from .patient import PatientSummarySerializer
from .doctor import DoctorSummarySerializer


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


class PaymentSummarySerializer(serializers.ModelSerializer):
    """Inline payment tóm tắt — nhúng vào AppointmentSerializer."""
    class Meta:
        model  = Payment
        fields = ("id", "amount", "payment_method", "status", "paid_at", "transaction_id")
        read_only_fields = fields


class AppointmentSerializer(serializers.ModelSerializer):
    patient_info         = PatientSummarySerializer(source="patient", read_only=True)
    doctor_info          = DoctorSummarySerializer(source="doctor", read_only=True)
    appointment_services = AppointmentServiceSerializer(many=True, read_only=True)
    # BUG FIX: thêm payment inline để FE (MyAppointments, AppointmentDetail) thấy TT
    payment              = PaymentSummarySerializer(read_only=True)

    class Meta:
        model  = Appointment
        fields = (
            "id", "patient", "patient_info", "doctor", "doctor_info",
            "schedule", "appointment_date", "status", "reason", "notes",
            "appointment_services", "payment", "created_at", "updated_at",
        )
        read_only_fields = ("id", "status", "created_at", "updated_at")

    def validate_appointment_date(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Thời gian hẹn phải là trong tương lai.")
        return value


class AppointmentCreateSerializer(serializers.ModelSerializer):
    services = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Service.objects.filter(is_active=True),
        write_only=True,
        required=False,
    )
    payment_method = serializers.ChoiceField(
        choices=Payment.Method.choices,
        write_only=True,
    )

    class Meta:
        model  = Appointment
        fields = (
            "id", "doctor", "schedule", "appointment_date", "reason", "notes",
            "services", "payment_method",
        )
        read_only_fields = ("id",)

    def create(self, validated_data):
        services       = validated_data.pop("services", [])
        payment_method = validated_data.pop("payment_method")
        patient        = self.context["request"].user.patient_profile

        appointment = Appointment.objects.create(patient=patient, **validated_data)

        for service in services:
            AppointmentService.objects.create(
                appointment=appointment,
                service=service,
                quantity=1,
                price_at_time=service.price,
            )

        # Tạo Payment PENDING ngay khi đặt lịch
        total = appointment.doctor.consultation_fee
        for svc in appointment.appointment_services.all():
            total += svc.get_subtotal()

        Payment.objects.create(
            appointment    = appointment,
            patient        = patient,
            amount         = total,
            payment_method = payment_method,
            status         = Payment.Status.PENDING,
        )

        return appointment

    def validate(self, data):
        schedule = data.get("schedule")
        if schedule:
            booked = schedule.appointments.exclude(status="cancelled").count()
            if booked >= schedule.max_appointments:
                raise serializers.ValidationError("Ca khám này đã đủ số lượng.")
        return data

    def to_representation(self, instance):
        """Sau khi create, trả về AppointmentSerializer đầy đủ."""
        return AppointmentSerializer(instance, context=self.context).data


class AppointmentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Appointment
        fields = ("status",)

    def validate_status(self, value):
        """
        Kiểm tra chuyển trạng thái dựa trên OAuth2 token scope.

        Quy tắc:
          patient : pending → cancelled, confirmed → cancelled
          doctor  : pending → confirmed | cancelled, confirmed → in_progress → completed | no_show
          staff   : pending → confirmed | no_show, any → cancelled
          admin   : không giới hạn
        """
        instance     = self.instance
        request      = self.context.get("request")
        token        = getattr(request, "auth", None) if request else None
        token_scopes = set(token.scope.split()) if token else set()

        if "admin" in token_scopes:
            return value

        ALLOWED_TRANSITIONS = {
            "patient": {
                "pending":   ["cancelled"],
                "confirmed": ["cancelled"],
            },
            "doctor": {
                "pending":      ["confirmed", "cancelled"],
                "confirmed":    ["in_progress", "completed", "no_show"],
                "in_progress":  ["completed", "no_show"],
            },
            "staff": {
                "pending":      ["confirmed", "cancelled", "no_show"],
                "confirmed":    ["in_progress", "cancelled", "no_show"],
                "in_progress":  ["completed", "cancelled"],
            },
        }

        active_scope = None
        for scope in ("doctor", "staff", "patient"):
            if scope in token_scopes:
                active_scope = scope
                break

        if active_scope:
            role_rules = ALLOWED_TRANSITIONS.get(active_scope, {})
            permitted  = role_rules.get(instance.status, [])
            if value not in permitted:
                raise serializers.ValidationError(
                    f"Không thể chuyển từ '{instance.status}' → '{value}'."
                )

        return value
