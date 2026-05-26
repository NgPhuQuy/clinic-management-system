from datetime import date
from rest_framework import serializers
from ..models import Patient


class PatientSerializer(serializers.ModelSerializer):
    email     = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model  = Patient
        fields = (
            "id", "user", "email", "full_name", "date_of_birth",
            "gender", "phone", "insurance_number",
            "blood_type", "emergency_contact",
        )
        read_only_fields = ("id", "user", "full_name")

    def validate_date_of_birth(self, value):
        if value and value >= date.today():
            raise serializers.ValidationError("Ngày sinh phải là ngày trong quá khứ.")
        return value


class PatientSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email     = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model  = Patient
        fields = ("id", "full_name", "email", "phone", "date_of_birth")