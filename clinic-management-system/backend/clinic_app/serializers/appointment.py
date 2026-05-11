from django.utils import timezone
from rest_framework import serializers
from ..models import Appointment, AppointmentService, Service
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

    def validate(self, data):
        schedule = data.get("schedule")
        if schedule:
            booked = schedule.appointments.exclude(status="cancelled").count()
            if booked >= schedule.max_appointments:
                raise serializers.ValidationError("Ca khám này đã đủ số lượng.")
        return data


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
