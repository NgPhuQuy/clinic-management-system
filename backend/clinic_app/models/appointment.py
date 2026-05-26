from django.db import models
from .patient import Patient
from .doctor import Doctor, DoctorSchedule
from .specialty import Service


class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING     = "pending",     "Chờ xác nhận"
        CONFIRMED   = "confirmed",   "Đã xác nhận"
        IN_PROGRESS = "in_progress", "Đang khám"
        COMPLETED   = "completed",   "Hoàn thành"
        CANCELLED   = "cancelled",   "Đã hủy"
        NO_SHOW     = "no_show",     "Không đến"

    patient          = models.ForeignKey(Patient,        on_delete=models.CASCADE,  related_name="appointments")
    doctor           = models.ForeignKey(Doctor,         on_delete=models.CASCADE,  related_name="appointments")
    schedule         = models.ForeignKey(DoctorSchedule, on_delete=models.SET_NULL, null=True, related_name="appointments")
    appointment_date = models.DateTimeField()
    status           = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    reason           = models.TextField(blank=True, help_text="Lý do khám")
    notes            = models.TextField(blank=True, help_text="Ghi chú thêm")
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = "appointments"
        verbose_name        = "Lịch hẹn"
        verbose_name_plural = "Lịch hẹn"
        ordering = ["-appointment_date"]

    def __str__(self):
        return f"{self.patient} → {self.doctor} | {self.appointment_date}"


class AppointmentService(models.Model):
    appointment   = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="appointment_services")
    service       = models.ForeignKey(Service,     on_delete=models.PROTECT)
    quantity      = models.PositiveIntegerField(default=1)
    price_at_time = models.DecimalField(max_digits=12, decimal_places=2, help_text="Giá tại thời điểm đặt")

    class Meta:
        db_table            = "appointment_services"
        verbose_name        = "Dịch vụ trong lịch hẹn"
        verbose_name_plural = "Dịch vụ trong lịch hẹn"
        ordering = ["id"]

    def get_subtotal(self):
        return self.quantity * self.price_at_time

    def __str__(self):
        return f"{self.service.name} x{self.quantity} ({self.appointment_id})"