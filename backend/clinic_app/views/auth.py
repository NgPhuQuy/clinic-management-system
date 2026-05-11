"""
clinic_app/views/auth.py

Endpoints:
  POST /auth/register/          — Đăng ký (AllowAny)
  GET  /auth/me/                — Thông tin user hiện tại
  PUT  /auth/change-password/   — Đổi mật khẩu
  POST /auth/firebase-token/    — Lấy Firebase Custom Token để dùng Chat

Lấy access token OAuth2:
  POST /o/token/
    grant_type=password
    username=<email>
    password=<password>
    client_id=<client_id>
    client_secret=<client_secret>
    scope=patient   (hoặc doctor / admin)
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Doctor, Patient
from ..permissions import IsAuthenticatedWithValidToken
from ..serializers import ChangePasswordSerializer, RegisterSerializer, UserSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


# ─────────────────────────────────────────────
# Firebase — lazy init để tránh crash khi chưa cấu hình
# ─────────────────────────────────────────────

def _get_firebase_app():
    """
    Khởi tạo Firebase Admin SDK lần đầu, trả về app.
    Raise ImportError / ValueError nếu chưa cấu hình.
    """
    import firebase_admin
    from firebase_admin import credentials

    if not firebase_admin._apps:
        cred_path = str(settings.FIREBASE_CREDENTIALS_PATH)
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firebase_admin.get_app()


# ─────────────────────────────────────────────
# Register
# ─────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    POST /auth/register/
    Đăng ký tài khoản mới (patient hoặc doctor).
    Tự động tạo Patient / Doctor profile tương ứng.

    Sau khi đăng ký, client gọi POST /o/token/ với
    grant_type=password để lấy access_token.
    """
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        if user.role == "patient":
            Patient.objects.create(user=user, full_name=user.username)
        elif user.role == "doctor":
            Doctor.objects.create(
                user=user,
                full_name=user.username,
                license_number=f"TEMP-{user.id}",
            )

        return Response(
            {
                "user": UserSerializer(user).data,
                # Token được lấy riêng qua POST /o/token/
                "message": "Đăng ký thành công. Dùng POST /o/token/ để lấy access_token.",
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────
# Me
# ─────────────────────────────────────────────

class MeView(generics.RetrieveUpdateAPIView):
    """
    GET   /auth/me/  — Lấy thông tin user hiện tại
    PATCH /auth/me/  — Cập nhật avatar
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedWithValidToken]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


# ─────────────────────────────────────────────
# Change Password
# ─────────────────────────────────────────────

class ChangePasswordView(generics.UpdateAPIView):
    """PUT /auth/change-password/"""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticatedWithValidToken]
    http_method_names = ["put", "head", "options"]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Đổi mật khẩu thành công."})


# ─────────────────────────────────────────────
# Firebase Custom Token
# ─────────────────────────────────────────────

class FirebaseTokenView(APIView):
    """
    POST /auth/firebase-token/

    Cấp Firebase Custom Token để client kết nối Firebase Realtime Chat.
    Token có hiệu lực 1 giờ (do Firebase quy định).

    Claims được nhúng vào token:
      - role:      patient | doctor | admin
      - clinic_uid: ID trong DB clinic

    Client dùng token này để signInWithCustomToken() trong Firebase SDK,
    sau đó đọc/ghi Firestore collection:
      /consultations/{consultationId}/messages/{messageId}
    """
    permission_classes = [IsAuthenticatedWithValidToken]

    def post(self, request):
        try:
            _get_firebase_app()
            from firebase_admin import auth as firebase_auth

            uid = f"clinic_{request.user.pk}"
            additional_claims = {
                "role":       request.user.role,
                "clinic_uid": request.user.pk,
                "email":      request.user.email,
            }

            custom_token: bytes = firebase_auth.create_custom_token(
                uid, additional_claims
            )

            return Response(
                {"firebase_token": custom_token.decode("utf-8")},
                status=status.HTTP_200_OK,
            )

        except ImportError:
            logger.error("firebase-admin chưa được cài. Chạy: pip install firebase-admin")
            return Response(
                {"detail": "Firebase chưa được cấu hình trên server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            logger.exception("Lỗi khi tạo Firebase custom token: %s", exc)
            return Response(
                {"detail": "Không thể tạo Firebase token."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )