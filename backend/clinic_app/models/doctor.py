from django.core.exceptions import ValidationError
from django.db import models
from .user import User
from .specialty import Specialty
from ckeditor.fields import RichTextField


class Doctor(models.Model):
    user              = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctor_profile")
    specialty         = models.ForeignKey(Specialty, on_delete=models.SET_NULL, null=True, related_name="doctors")
    license_number    = models.CharField(max_length=100, unique=True)
    experience_years  = models.PositiveIntegerField(default=0)
    consultation_fee  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bio               = RichTextField(blank=True)
    is_available      = models.BooleanField(default=True)

    class Meta:
        db_table            = "doctors"
        verbose_name        = "Bác sĩ"
        verbose_name_plural = "Bác sĩ"
        ordering = ["id"]
        
    def __str__(self):
        return f"BS. {self.user.get_full_name()} - {self.specialty}"


class DoctorSchedule(models.Model):
    doctor            = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="schedules")
    date              = models.DateField()
    start_time        = models.TimeField()
    end_time          = models.TimeField()
    max_appointments  = models.PositiveIntegerField(default=10)
    is_available      = models.BooleanField(default=True)

    class Meta:
        db_table            = "doctor_schedules"
        verbose_name        = "Lịch làm việc"
        verbose_name_plural = "Lịch làm việc"
        ordering = ["date", "start_time"]
        unique_together = ("doctor", "date", "start_time")

    def clean(self):
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError("Giờ bắt đầu phải trước giờ kết thúc.")

    def __str__(self):
        return f"{self.doctor} | {self.date} {self.start_time}-{self.end_time}"