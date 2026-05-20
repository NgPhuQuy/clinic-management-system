from django.db import models
from .user import User


class Patient(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Nam"
        FEMALE = "female", "Nữ"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="patient_profile")
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    insurance_number = models.CharField(max_length=50, blank=True)
    blood_type = models.CharField(max_length=5, blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "patients"
        verbose_name = "Bệnh nhân"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name
