from django.db import models
from cloudinary.models import CloudinaryField


class Specialty(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    icon = CloudinaryField(null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "specialties"
        verbose_name = "Chuyên khoa"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Service(models.Model):
    specialty = models.ForeignKey(
        Specialty, on_delete=models.SET_NULL, null=True, related_name="services"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "services"
        verbose_name = "Dịch vụ y tế"

    def __str__(self):
        return self.name