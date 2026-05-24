from django.db import models
from .user import User
from .specialty import Specialty
from datetime import timezone

class Staff(models.Model):
    class Position(models.TextChoices):
        NURSE           = "nurse",        "Điều dưỡng viên"
        LAB_TECHNICIAN  = "lab_tech",     "Kỹ thuật viên xét nghiệm"
        PHARMACIST      = "pharmacist",   "Dược sĩ"
        RECEPTIONIST    = "receptionist", "Nhân viên lễ tân"
        XRAY_TECHNICIAN = "xray_tech",    "Kỹ thuật viên X-quang"

    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff_profile")
    department  = models.ForeignKey(Specialty, on_delete=models.SET_NULL, null=True, blank=True, related_name="staff")
    employee_id = models.CharField(max_length=20, unique=True, editable=False)
    position    = models.CharField(max_length=20, choices=Position, default=Position.NURSE)
    phone       = models.CharField(max_length=15, blank=True)

    def save(self, *args, **kwargs):
        if not self.employee_id:
            prefix = self.position[:2].upper()
            year   = timezone.now().year
            count  = Staff.objects.filter(position=self.position).count() + 1
            self.employee_id = f"{prefix}{year}{count:03d}"
        super().save(*args, **kwargs)


    class Meta:
        db_table            = "staff"
        verbose_name        = "Nhân viên y tế"
        verbose_name_plural = "Nhân viên y tế"
        ordering = ["id"]

    def __str__(self):
        return f"{self.get_position_display()} - {self.user.get_full_name()}"