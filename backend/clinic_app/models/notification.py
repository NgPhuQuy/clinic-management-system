from django.db import models
from .user import User


class Notification(models.Model):
    class Type(models.TextChoices):
        APPOINTMENT_REMINDER = "appointment_reminder", "Nhắc lịch hẹn"
        APPOINTMENT_CONFIRMED = "appointment_confirmed", "Xác nhận lịch hẹn"
        APPOINTMENT_CANCELLED = "appointment_cancelled", "Hủy lịch hẹn"
        PRESCRIPTION_READY = "prescription_ready", "Đơn thuốc sẵn sàng"
        PAYMENT_SUCCESS = "payment_success", "Thanh toán thành công"
        INVENTORY_ALERT = "inventory_alert", "Cảnh báo kho thuốc"
        SYSTEM = "system", "Hệ thống"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=50, choices=Type, default=Type.SYSTEM)
    is_read = models.BooleanField(default=False)
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        verbose_name = "Thông báo"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user}"
