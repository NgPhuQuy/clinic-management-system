from rest_framework import serializers
from ..models import MedicalRecord, TestResult
from .patient import PatientSummarySerializer
from .doctor import DoctorSummarySerializer


class TestResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestResult
        fields = "__all__"
        read_only_fields = ("id", "medical_record", "entered_by")


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
