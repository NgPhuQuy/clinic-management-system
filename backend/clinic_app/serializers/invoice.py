from rest_framework import serializers
from ..models import Invoice, Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Payment
        fields = (
            "id", "invoice", "amount", "payment_method", "status",
            "transaction_id", "note", "paid_at", "created_at",
        )
        read_only_fields = ("id", "status", "transaction_id", "paid_at", "created_at")


class InvoiceSerializer(serializers.ModelSerializer):
    payments     = PaymentSerializer(many=True, read_only=True)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_paid   = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    remaining    = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = Invoice
        fields = (
            "id", "appointment",
            "total_amount", "total_paid", "remaining",
            "payments", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class InvoiceSummarySerializer(serializers.ModelSerializer):
    """Dùng inline trong AppointmentSerializer."""
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_paid   = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    remaining    = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = Invoice
        fields = ("id", "total_amount", "total_paid", "remaining")
        read_only_fields = fields


class PaymentInitSerializer(serializers.Serializer):
    invoice_id     = serializers.IntegerField()
    amount         = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices)
    note           = serializers.CharField(required=False, allow_blank=True)
