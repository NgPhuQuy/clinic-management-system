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


class PaymentInitSerializer(serializers.Serializer):
    """Dùng để khởi tạo thanh toán → trả về payment_url."""
    invoice_id     = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices)
    # Tuỳ chọn — nếu không truyền, backend tự lấy invoice.remaining
    amount         = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    # Ghi chú hiển thị trên màn thanh toán / admin (vd: "Phí khám", "Tiền thuốc")
    note           = serializers.CharField(max_length=255, required=False, allow_blank=True)