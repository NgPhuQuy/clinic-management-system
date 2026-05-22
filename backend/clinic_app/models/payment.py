from django.db import models
from .patient import Patient
from .appointment import Appointment


class Payment(models.Model):
    class Method(models.TextChoices):
        MOMO = "momo", "MoMo"
        VNPAY = "vnpay", "VNPay"
        CREDIT_CARD = "credit_card", "Thẻ tín dụng"
        CASH = "cash", "Tiền mặt"
        BANKING = "banking", "Chuyển khoản"

    class Status(models.TextChoices):
        PENDING = "pending", "Chờ thanh toán"
        SUCCESS = "success", "Thành công"
        FAILED = "failed", "Thất bại"
        REFUNDED = "refunded", "Đã hoàn tiền"

    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name="payment")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=Method)
    status = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    transaction_id = models.CharField(max_length=255, blank=True, help_text="Mã giao dịch từ cổng TT")
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payments"
        verbose_name = "Thanh toán"
        ordering = ["-created_at"]

    def __str__(self):
        return f"TT#{self.pk} - {self.patient} - {self.amount:,.0f}đ [{self.status}]"
