from rest_framework import serializers
from ..models import Doctor, DoctorSchedule


class DoctorSerializer(serializers.ModelSerializer):
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)
    email          = serializers.EmailField(source="user.email", read_only=True)
    full_name      = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model  = Doctor
        fields = (
            "id", "user", "email", "specialty", "specialty_name",
            "full_name", "license_number", "experience_years",
            "consultation_fee", "bio", "is_available",
        )
        read_only_fields = ("id", "user", "full_name")


class DoctorSummarySerializer(serializers.ModelSerializer):
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)
    full_name      = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model  = Doctor
        fields = ("id", "full_name", "specialty_name", "consultation_fee")


class DoctorScheduleSerializer(serializers.ModelSerializer):
    doctor_name  = serializers.CharField(source="doctor.user.get_full_name", read_only=True)
    booked_count = serializers.SerializerMethodField()

    class Meta:
        model  = DoctorSchedule
        fields = (
            "id", "doctor", "doctor_name", "date",
            "start_time", "end_time", "max_appointments",
            "booked_count", "is_available",
        )
        read_only_fields = ("id",)

    def get_booked_count(self, obj):
        if hasattr(obj, "booked_count"):
            return obj.booked_count
        return obj.appointments.exclude(status="cancelled").count()

    def validate(self, data):
        if data.get("start_time") and data.get("end_time"):
            if data["start_time"] >= data["end_time"]:
                raise serializers.ValidationError("Giờ bắt đầu phải trước giờ kết thúc.")
        return data