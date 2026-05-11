from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from ..models import Patient, Doctor
from ..serializers import RegisterSerializer, UserSerializer, ChangePasswordSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /auth/register/
    Đăng ký tài khoản mới (patient hoặc doctor).
    Tự động tạo Patient/Doctor profile tương ứng.
    """
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        if user.role == "patient":
            Patient.objects.get_or_create(user=user, defaults={"full_name": f"{user.first_name} {user.last_name}".strip() or user.username})
        elif user.role == "doctor":
            Doctor.objects.get_or_create(user=user, defaults={"full_name": f"{user.first_name} {user.last_name}".strip() or user.username, "license_number": f"TEMP-{user.id}"})

        return Response(
            {"user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET  /auth/me/   — Lấy thông tin user hiện tại
    PATCH /auth/me/  — Cập nhật thông tin
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """PUT /auth/change-password/"""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Đổi mật khẩu thành công."})
