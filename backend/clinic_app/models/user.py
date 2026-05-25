from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from cloudinary.models import CloudinaryField


class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "patient", "Bệnh nhân"
        DOCTOR  = "doctor",  "Bác sĩ"
        STAFF   = "staff",   "Nhân viên y tế"
        ADMIN   = "admin",   "Quản trị viên"

    role   = models.CharField(max_length=20, choices=Role, default=Role.PATIENT)
    avatar = CloudinaryField(null=True)

    oauth_provider = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="facebook | google | None",
    )
    oauth_uid = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table        = "users"
        verbose_name        = "Người dùng"
        verbose_name_plural = "Người dùng"

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"