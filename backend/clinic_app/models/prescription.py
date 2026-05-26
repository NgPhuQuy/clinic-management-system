from django.db import models
from .medical_record import MedicalRecord
from .medicine import Medicine
from .staff import Staff


class Prescription(models.Model):
    class Status(models.TextChoices):
        PENDING   = "pending",   "Chờ cấp phát"
        DISPENSED = "dispensed", "Đã cấp phát"
        CANCELLED = "cancelled", "Đã hủy"

    medical_record = models.OneToOneField(MedicalRecord, on_delete=models.CASCADE, related_name="prescription")
    status       = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    dispensed_at = models.DateTimeField(null=True, blank=True)
    dispensed_by   = models.ForeignKey(Staff, on_delete=models.SET_NULL,null=True, blank=True,
                                        related_name="dispensed_prescriptions",help_text="Dược sĩ cấp phát")

    class Meta:
        db_table            = "prescriptions"
        verbose_name        = "Đơn thuốc"
        verbose_name_plural = "Đơn thuốc"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Đơn thuốc #{self.pk} - {self.medical_record.patient}"


class PrescriptionDetail(models.Model):
    prescription  = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name="details")
    medicine      = models.ForeignKey(Medicine,     on_delete=models.PROTECT,  related_name="prescription_details")
    quantity      = models.PositiveIntegerField()
    dosage        = models.CharField(max_length=100, help_text="Liều dùng mỗi lần")
    frequency     = models.CharField(max_length=100, help_text="Số lần/ngày")
    duration_days = models.PositiveIntegerField(help_text="Số ngày dùng thuốc")
    instructions  = models.TextField(blank=True, help_text="Hướng dẫn sử dụng")
    price_at_time = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table            = "prescription_details"
        verbose_name        = "Chi tiết đơn thuốc"
        verbose_name_plural = "Chi tiết đơn thuốc"
        ordering = ["id"]

    def get_subtotal(self):
        return self.quantity * self.price_at_time

    def __str__(self):
        return f"{self.medicine.name} x{self.quantity}"