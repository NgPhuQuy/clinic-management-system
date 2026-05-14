"""
base_test.py — Lớp nền và các factory dùng chung cho toàn bộ test suite.

Mỗi test module import BaseAPITestCase thay vì viết lại setup.
"""

from datetime import timedelta
from django.utils import timezone
from oauth2_provider.models import AccessToken, Application
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
import secrets
from clinic_app.models import (
    Patient, Doctor, Specialty, DoctorSchedule,
    MedicineCategory, Medicine, Inventory,
)

User = get_user_model()


# ─────────────────────────────────────────────────────────────
# Factories — tạo object nhanh, không cần thư viện factory_boy
# ─────────────────────────────────────────────────────────────

def make_user(email, password="Test@1234", role="patient", **kwargs):
    """Tạo User với email + password + role."""
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        password=password,
        role=role,
        **kwargs,
    )


def make_patient_user(email="patient@test.com", **kwargs):
    user = make_user(email, role="patient", **kwargs)
    Patient.objects.get_or_create(user=user, defaults={"full_name": user.username})
    return user


def make_doctor_user(email="doctor@test.com", specialty=None, **kwargs):
    user = make_user(email, role="doctor", **kwargs)
    if specialty is None:
        specialty, _ = Specialty.objects.get_or_create(
            name="Nội khoa", defaults={"description": "Khoa nội"}
        )
    Doctor.objects.get_or_create(
        user=user,
        defaults={
            "full_name": user.username,
            "specialty": specialty,
            "license_number": f"LIC-{user.id or 1}",
            "consultation_fee": 200_000,
        },
    )
    return user


def make_admin_user(email="admin@test.com", **kwargs):
    return User.objects.create_superuser(
        email=email,
        username=email.split("@")[0],
        password="Admin@1234",
        **kwargs,
    )


def get_oauth2_token_for_user(user, scope="read"):
    app, _ = Application.objects.get_or_create(
        name="TestApp",
        defaults={
            "client_type": Application.CLIENT_CONFIDENTIAL,
            "authorization_grant_type": Application.GRANT_PASSWORD,
            "user": user,
        }
    )
    token = AccessToken.objects.create(
        user=user,
        application=app,
        token=secrets.token_urlsafe(32),
        expires=timezone.now() + timedelta(hours=1),
        scope=scope,
    )
    return token.token



# ─────────────────────────────────────────────────────────────
# Base test class
# ─────────────────────────────────────────────────────────────

class BaseAPITestCase(APITestCase):
    """
    Mọi test class đều kế thừa class này.
    Cung cấp:
      - self.client  (APIClient)
      - self.admin / self.doctor_user / self.patient_user
      - self.auth(user)  → gắn JWT vào client
    """

    @classmethod
    def setUpTestData(cls):
        # Dùng setUpTestData để tạo 1 lần cho cả class (nhanh hơn setUp)
        cls.specialty, _ = Specialty.objects.get_or_create(
            name="Nội khoa", defaults={"description": "Khoa nội tổng quát"}
        )

        cls.admin = make_admin_user("admin@test.com")
        cls.patient_user = make_patient_user("patient@test.com")
        cls.doctor_user = make_doctor_user("doctor@test.com", specialty=cls.specialty)

    def setUp(self):
        self.client = APIClient()

    def auth(self, user):
        """Gắn JWT Bearer token cho user vào self.client."""
        token = get_oauth2_token_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return token

    def unauth(self):
        """Xóa credentials (anonymous request)."""
        self.client.credentials()