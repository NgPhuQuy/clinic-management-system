from rest_framework import serializers
from ..models import Prescription, PrescriptionDetail


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
