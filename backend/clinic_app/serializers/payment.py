from rest_framework import serializers
from ..models import Payment


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
