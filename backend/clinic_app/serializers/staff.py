from rest_framework import serializers
from ..models import Staff


class StaffSerializer(serializers.ModelSerializer):
    email         = serializers.EmailField(source="user.email", read_only=True)
    full_name     = serializers.CharField(source="user.get_full_name", read_only=True)
    position_display = serializers.CharField(source="get_position_display", read_only=True)

    class Meta:
        model  = Staff
        fields = (
            "id", "user", "email", "full_name",
            "employee_id", "position", "position_display",
            "department", "phone",
        )
        read_only_fields = ("id", "user", "employee_id", "full_name")


class StaffSummarySerializer(serializers.ModelSerializer):
    """Dùng trong nested contexts (TestResult.entered_by, Prescription.dispensed_by…)."""
    full_name        = serializers.CharField(source="user.get_full_name", read_only=True)
    position_display = serializers.CharField(source="get_position_display", read_only=True)

    class Meta:
        model  = Staff
        fields = ("id", "full_name", "position_display")