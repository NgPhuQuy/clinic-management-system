from django.db import models
from .appointment import Appointment
from .prescription import Prescription


class Payment(models.Model):
    class Method(models.TextChoices):
        MOMO        = "momo",        "MoMo"
        VNPAY       = "vnpay",       "VNPay"
        CREDIT_CARD = "credit_card", "Thẻ tín dụng"
        CASH        = "cash",        "Tiền mặt"
        BANKING     = "banking",     "Chuyển khoản"

    class Status(models.TextChoices):
        PENDING  = "pending",  "Chờ thanh toán"
        SUCCESS  = "success",  "Thành công"
        FAILED   = "failed",   "Thất bại"
        REFUNDED = "refunded", "Đã hoàn tiền"

    appointment  = models.OneToOneField(
        Appointment, on_delete=models.CASCADE,
        null=True, blank=True, related_name="payment",
        help_text="Thanh toán tiền khám + dịch vụ",
    )
    prescription = models.OneToOneField(
        Prescription, on_delete=models.CASCADE,
        null=True, blank=True, related_name="payment",
        help_text="Thanh toán tiền thuốc",
    )

    amount          = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method  = models.CharField(max_length=20, choices=Method)
    status          = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    transaction_id  = models.CharField(max_length=255, blank=True, help_text="Mã giao dịch từ cổng TT")
    note           = models.CharField(max_length=255, blank=True)
    paid_at         = models.DateTimeField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table            = "payments"
        verbose_name        = "Thanh toán"
        verbose_name_plural = "Thanh toán"
        ordering = ["-created_at"]

    def __str__(self):
        source = f"Appointment#{self.appointment_id}" if self.appointment_id else f"Prescription#{self.prescription_id}"
        return f"TT#{self.pk} [{source}] {self.amount:,.0f}đ - {self.get_status_display()}"
 