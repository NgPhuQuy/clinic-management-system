from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from cloudinary.models import CloudinaryField


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "patient", "Bệnh nhân"
        DOCTOR = "doctor", "Bác sĩ"
        ADMIN = "admin", "Quản trị viên"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role, default=Role.PATIENT)
    avatar = CloudinaryField(null=True)

    # OAuth2 / Social login
    oauth_provider = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="facebook | google | None"
    )
    oauth_uid = models.CharField(max_length=255, blank=True, null=True)

    objects = UserManager()

    class Meta:
        db_table = "users"
        verbose_name = "Người dùng"

    def __str__(self):
        return f"{self.email} ({self.role})"