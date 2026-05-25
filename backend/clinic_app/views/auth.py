"""
clinic_app/views/auth.py

Endpoints:
  POST /auth/login/             — Đăng nhập (AllowAny)
  POST /auth/register/          — Đăng ký   (AllowAny)
  GET  /auth/me/                — Thông tin user hiện tại
  PUT  /auth/change-password/   — Đổi mật khẩu
  POST /auth/firebase-token/    — Lấy Firebase Custom Token để dùng Chat
"""

import logging

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
import requests

from ..models import Doctor, Patient
from ..permissions import IsAuthenticatedWithValidToken
from ..serializers import ChangePasswordSerializer, RegisterSerializer, UserSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


# ─────────────────────────────────────────────
# Firebase — lazy init
# ─────────────────────────────────────────────

def _get_firebase_app():
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
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"detail": "Vui lòng nhập username và password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)

        if user is None:
            return Response(
                {"detail": "Sai tên đăng nhập hoặc mật khẩu."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Tài khoản đã bị vô hiệu hóa."},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        token_response = requests.post(
            request.build_absolute_uri("/o/token/"),
            json={
                "grant_type":    "password",
                "username":      user.username,
                "password":      password,
                "client_id":     settings.CLIENT_ID,
                "client_secret": settings.CLIENT_SECRET,
                "scope":         user.role,
            }
        )
        
        if token_response.status_code != 200:
            return Response(
                {"detail": "Không thể lấy token. Vui lòng thử lại."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = token_response.json()
        data["user"] = UserSerializer(user).data
        return Response(data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
# Register
# ─────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    POST /auth/register/
    Đăng ký tài khoản mới.
    Role hợp lệ: patient.
    (staff và admin chỉ được tạo bởi admin qua Django Admin hoặc API riêng)
    """
    serializer_class   = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Chặn tự đăng ký role staff/admin
        if user.role in ("staff", "admin"):
            user.delete()
            return Response(
                {"detail": "Không thể tự đăng ký role này."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Patient.objects.create(user=user, full_name=user.username)

        return Response(
            {
                "user": UserSerializer(user).data,
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
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticatedWithValidToken]
    http_method_names  = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


# ─────────────────────────────────────────────
# Change Password
# ─────────────────────────────────────────────

class ChangePasswordView(generics.UpdateAPIView):
    """PUT /auth/change-password/"""
    serializer_class   = ChangePasswordSerializer
    permission_classes = [IsAuthenticatedWithValidToken]
    http_method_names  = ["put", "head", "options"]

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

            custom_token: bytes = firebase_auth.create_custom_token(uid, additional_claims)

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
