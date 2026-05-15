"""
clinic_app/views/auth.py

Endpoints:
  POST /auth/login/             — Đăng Nhập (AllowAny)
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
import os
import requests

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
# Login
# ─────────────────────────────────────────────
class LoginView(APIView):
    """
    POST /auth/login/
    Mobile app chỉ gửi username + password.
    Backend tự gắn client_id, client_secret rồi gọi /o/token/.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        # Validate
        if not username or not password:
            return Response(
                {'detail': 'Vui lòng nhập username và password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Gọi /o/token/ từ phía SERVER
        token_url = request.build_absolute_uri('/o/token/')

        token_response = requests.post(token_url, data={
            'grant_type': 'password',
            'username': username,
            'password': password,
            'client_id': settings.OAUTH2_CLIENT_ID,
            'client_secret': settings.OAUTH2_CLIENT_SECRET,
        })

        # Nếu OAuth2 server trả lỗi thì chuyển tiếp lỗi về app
        if token_response.status_code != 200:
            return Response(
                {'detail': 'Sai tên đăng nhập hoặc mật khẩu.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Trả access_token về cho mobile app
        return Response(token_response.json(), status=status.HTTP_200_OK)


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