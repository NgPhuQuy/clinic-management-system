from rest_framework import serializers
from ..models import Invoice, Payment


class PaymentSerializer(serializers.ModelSerializer):
    # ADDED: patient_name để StaffPayments.js hiển thị được tên bệnh nhân
    # obj.patient là @property trên Payment → traverse invoice → appointment → patient
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model  = Payment
        fields = (
            "id", "invoice", "amount", "payment_method", "status",
            "transaction_id", "note", "paid_at", "created_at",
            "patient_name",                                  # ADDED
        )
        read_only_fields = ("id", "transaction_id", "paid_at", "created_at", "patient_name")

    def get_patient_name(self, obj):
        try:
            return obj.patient.user.get_full_name()
        except Exception:
            return None


class InvoiceSerializer(serializers.ModelSerializer):
    payments         = PaymentSerializer(many=True, read_only=True)
    patient_name     = serializers.SerializerMethodField()
    amount_paid      = serializers.SerializerMethodField()
    amount_remaining = serializers.SerializerMethodField()

    class Meta:
        model  = Invoice
        fields = (
            "id", "appointment", "prescription",
            "patient_name",
            "subtotal_services", "subtotal_medicine", "discount", "total",
            "status", "notes",
            "amount_paid", "amount_remaining",
            "payments",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "subtotal_services", "subtotal_medicine",
            "total", "created_at", "updated_at",
        )

    def get_patient_name(self, obj):
        try:
            return obj.patient.user.get_full_name()
        except Exception:
            return None

    def get_amount_paid(self, obj):
        return obj.amount_paid

    def get_amount_remaining(self, obj):
        return obj.amount_remaining


class InvoiceSummarySerializer(serializers.ModelSerializer):
    """Inline vào AppointmentSerializer."""
    amount_paid      = serializers.SerializerMethodField()
    amount_remaining = serializers.SerializerMethodField()

    class Meta:
        model  = Invoice
        fields = (
            "id", "total", "discount", "status",
            "amount_paid", "amount_remaining",
        )
        read_only_fields = fields

    def get_amount_paid(self, obj):
        return obj.amount_paid

    def get_amount_remaining(self, obj):
        return obj.amount_remaining


class PaymentInitSerializer(serializers.Serializer):
    invoice_id     = serializers.IntegerField()
    amount         = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices)
    note           = serializers.CharField(required=False, allow_blank=True)