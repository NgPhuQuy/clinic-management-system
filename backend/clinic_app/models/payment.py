from django.db import models
from .appointment import Appointment


class Invoice(models.Model):
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name="invoice")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_amount(self):
        consultation = self.appointment.doctor.consultation_fee
        services = sum(s.get_subtotal() for s in self.appointment.appointment_services.all())
        try:
            medicine = sum(
                d.get_subtotal()
                for d in self.appointment.medical_record.prescription.details.all()
            )
        except Exception:
            medicine = 0
        return consultation + services + medicine

    @property
    def total_paid(self):
        return sum(
            p.amount for p in self.payments.filter(status=Payment.Status.SUCCESS)
        )

    @property
    def remaining(self):
        return self.total_amount - self.total_paid

    class Meta:
        db_table            = "invoices"
        verbose_name        = "Hóa đơn"
        verbose_name_plural = "Hóa đơn"
        ordering            = ["-created_at"]

    def __str__(self):
        return f"HD{self.pk:06d} - {self.appointment.patient}"


class Payment(models.Model):
    """
    Một lần thanh toán trong hóa đơn.
    Mỗi Invoice có thể có nhiều Payment:
      - Tiền khám (bước 2)
      - Tiền dịch vụ xét nghiệm (bước 3)
      - Tiền thuốc (bước 4)
    """
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

    invoice        = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount         = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=Method)
    status         = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    transaction_id = models.CharField(max_length=255, blank=True, help_text="Mã giao dịch từ cổng TT")
    note           = models.CharField(max_length=255, blank=True, help_text="Phí khám / Dịch vụ XN / Tiền thuốc")
    paid_at        = models.DateTimeField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table            = "payments"
        verbose_name        = "Thanh toán"
        verbose_name_plural = "Thanh toán"
        ordering            = ["-created_at"]

    def __str__(self):
        return f"TT#{self.pk} [{self.note}] {self.amount:,.0f}đ - {self.get_status_display()}"