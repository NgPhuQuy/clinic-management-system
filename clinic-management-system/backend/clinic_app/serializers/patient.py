from rest_framework import serializers
from ..models import Patient


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
