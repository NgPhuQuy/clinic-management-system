from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from ..models import Appointment, AppointmentService, Service, Payment, Invoice
from .patient import PatientSummarySerializer
from .doctor import DoctorSummarySerializer
from .invoice import InvoiceSerializer


class AppointmentServiceSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model  = AppointmentService
        fields = ("id", "service", "service_name", "quantity", "price_at_time")
        read_only_fields = ("price_at_time",)

    def create(self, validated_data):
        validated_data["price_at_time"] = validated_data["service"].price
        return super().create(validated_data)


class AppointmentSerializer(serializers.ModelSerializer):
    patient_info         = PatientSummarySerializer(source="patient", read_only=True)
    doctor_info          = DoctorSummarySerializer(source="doctor", read_only=True)
    appointment_services = AppointmentServiceSerializer(many=True, read_only=True)
    invoice              = InvoiceSerializer(read_only=True)
    consultation_id      = serializers.SerializerMethodField()

    def get_consultation_id(self, obj):
        try:
            return obj.consultation.id
        except Exception:
            return None

    class Meta:
        model  = Appointment
        fields = (
            "id", "patient", "patient_info", "doctor", "doctor_info",
            "schedule", "appointment_date", "status", "reason", "notes",
            "appointment_services", "invoice", "consultation_id", "created_at", "updated_at",
        )
        read_only_fields = ("id", "status", "created_at", "updated_at")

    def validate_appointment_date(self, value):
        today = timezone.localtime(timezone.now()).date()
        if value.date() < today:
            raise serializers.ValidationError("Thời gian hẹn phải là hôm nay hoặc trong tương lai.")
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
        required=False,
        default=Payment.Method.CASH,
    )

    class Meta:
        model  = Appointment
        fields = (
            "id", "doctor", "schedule", "appointment_date", "reason", "notes",
            "services", "payment_method",
        )
        read_only_fields = ("id",)

    def validate_appointment_date(self, value):
        today = timezone.localtime(timezone.now()).date()
        if value.date() < today:
            raise serializers.ValidationError("Thời gian hẹn phải là hôm nay hoặc trong tương lai.")
        return value

    def validate(self, data):
        doctor = data.get("doctor")
        if doctor and not doctor.is_available:
            raise serializers.ValidationError("Bác sĩ hiện không nhận lịch hẹn.")

        schedule = data.get("schedule")
        appointment_date = data.get("appointment_date")

        if schedule:
            booked = schedule.appointments.exclude(status="cancelled").count()
            if booked >= schedule.max_appointments:
                raise serializers.ValidationError("Ca khám này đã đủ số lượng.")

            if appointment_date and schedule.date != timezone.localtime(appointment_date).date():
                raise serializers.ValidationError("Ngày hẹn không khớp với ngày trong lịch làm việc.")

        if doctor and appointment_date:
            request = self.context.get("request")
            if request and hasattr(request.user, "patient_profile"):
                duplicate = Appointment.objects.filter(
                    patient=request.user.patient_profile,
                    doctor=doctor,
                    appointment_date=appointment_date,
                ).exclude(status=Appointment.Status.CANCELLED).exists()
                if duplicate:
                    raise serializers.ValidationError("Bạn đã có lịch hẹn với bác sĩ này vào thời điểm đó.")

        return data

    def create(self, validated_data):
        services       = validated_data.pop("services", [])
        payment_method = validated_data.pop("payment_method")
        patient        = self.context["request"].user.patient_profile

        with transaction.atomic():
            appointment = Appointment.objects.create(patient=patient, **validated_data)

            for service in services:
                AppointmentService.objects.create(
                    appointment   = appointment,
                    service       = service,
                    quantity      = 1,
                    price_at_time = service.price,
                )

            invoice = Invoice.objects.create(appointment=appointment)

            total = appointment.doctor.consultation_fee
            for svc in appointment.appointment_services.all():
                total += svc.get_subtotal()

            Payment.objects.create(
                invoice        = invoice,
                amount         = total,
                payment_method = payment_method,
                status         = Payment.Status.PENDING,
                note           = "Phí khám + dịch vụ",
            )

        return appointment

    def to_representation(self, instance):
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
                "pending":     ["confirmed", "cancelled"],
                "confirmed":   ["in_progress", "completed", "no_show"],
                "in_progress": ["completed", "no_show"],
            },
            "staff": {
                "pending":     ["confirmed", "cancelled", "no_show"],
                "confirmed":   ["in_progress", "cancelled", "no_show"],
                "in_progress": ["completed", "cancelled"],
            },
        }

        active_scope = next(
            (s for s in ("doctor", "staff", "patient") if s in token_scopes),
            None,
        )

        if active_scope:
            permitted = ALLOWED_TRANSITIONS.get(active_scope, {}).get(instance.status, [])
            if value not in permitted:
                raise serializers.ValidationError(
                    f"Không thể chuyển từ '{instance.status}' → '{value}'."
                )

        return value