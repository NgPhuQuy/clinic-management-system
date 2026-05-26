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


def _get_firebase_app():
    import firebase_admin
    from firebase_admin import credentials
    if not firebase_admin._apps:
        cred_path = str(settings.FIREBASE_CREDENTIALS_PATH)
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firebase_admin.get_app()


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
            },
        )

        if token_response.status_code != 200:
            return Response(
                {"detail": "Không thể lấy token. Vui lòng thử lại."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = token_response.json()
        data["user"] = UserSerializer(user).data
        return Response(data, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    serializer_class   = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        role = request.data.get("role", "patient")
        if role in ("staff", "admin", "doctor"):
            return Response(
                {"detail": "Không thể tự đăng ký role này."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        user.first_name = user.username
        user.save(update_fields=["first_name"])
        Patient.objects.create(user=user)

        return Response(
            {
                "user":    UserSerializer(user).data,
                "message": "Đăng ký thành công.",
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticatedWithValidToken]
    http_method_names  = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
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


class FirebaseTokenView(APIView):
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