from django.db import models
from .user import User
from .specialty import Specialty


class Doctor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctor_profile")
    specialty = models.ForeignKey(
        Specialty, on_delete=models.SET_NULL, null=True, related_name="doctors"
    )
    full_name = models.CharField(max_length=255)
    license_number = models.CharField(max_length=100, unique=True)
    experience_years = models.PositiveIntegerField(default=0)
    consultation_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bio = models.TextField(blank=True)
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = "doctors"
        verbose_name = "Bác sĩ"

    def __str__(self):
        return f"BS. {self.full_name} - {self.specialty}"


class DoctorSchedule(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="schedules")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    max_appointments = models.PositiveIntegerField(default=10)
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = "doctor_schedules"
        verbose_name = "Lịch làm việc"
        unique_together = ("doctor", "date", "start_time")

    def __str__(self):
        return f"{self.doctor} | {self.date} {self.start_time}-{self.end_time}"
