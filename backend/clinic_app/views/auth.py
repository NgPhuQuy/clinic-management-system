"""
clinic_app/views/auth.py
"""

import logging
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
from oauth2_provider.models import Application

logger = logging.getLogger(__name__)
User = get_user_model()

def get_oauth_application():
    return Application.objects.filter(
        authorization_grant_type="password",
        client_type="confidential"
    ).first()

def _get_firebase_app():
    import firebase_admin
    from firebase_admin import credentials
    if not firebase_admin._apps:
        cred_path = str(settings.FIREBASE_CREDENTIALS_PATH)
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firebase_admin.get_app()


class LoginView(APIView):
    """
    POST /auth/login/
    Mobile app chỉ gửi username + password.
    Backend tự gắn client_id, client_secret và scope đúng rồi gọi /o/token/.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                data={'detail': 'Vui lòng nhập username và password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Xác định scope theo role của user
        try:
            user_obj = User.objects.get(username=username)
            scope = user_obj.role if user_obj.role in ('admin', 'doctor', 'patient') else 'read'
        except User.DoesNotExist:
            return Response(
                {'detail': 'Sai tên đăng nhập hoặc mật khẩu.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Gọi /o/token/ từ phía SERVER, truyền đúng scope
        token_url = request.build_absolute_uri('/o/token/')

        app = get_oauth_application()

        token_response = requests.post(token_url, data={
            'grant_type': 'password',
            'username': username,
            'password': password,
            'client_id': app.client_id,
            'client_secret': app.client_secret,
            'scope': scope,
        })

        if token_response.status_code != 200:
            logger.error("OAuth2 token error: %s", token_response.text)
            return Response(
                {'detail': 'Sai tên đăng nhập hoặc mật khẩu.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response(token_response.json(), status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    """
    POST /auth/register/
    Đăng ký tài khoản mới (patient hoặc doctor).
    Sau khi đăng ký, tự động đăng nhập và trả về token luôn.
    """
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        if user.role == "patient":
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            Patient.objects.create(user=user, full_name=full_name)
        elif user.role == "doctor":
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            Doctor.objects.create(
                user=user,
                full_name=full_name,
                license_number=f"TEMP-{user.id}",
            )

        # Tự động lấy token sau khi đăng ký
        scope = user.role if user.role in ('admin', 'doctor', 'patient') else 'read'
        token_url = request.build_absolute_uri('/o/token/')
        app = get_oauth_application()

        token_response = requests.post(token_url, data={
            'grant_type': 'password',
            'username': request.data.get('username'),
            'password': request.data.get('password'),
            'client_id': app.client_id,
            'client_secret': app.client_secret,
            'scope': scope,
        })

        token_data = token_response.json() if token_response.status_code == 200 else {}

        return Response(
            {
                "user": UserSerializer(user).data,
                **token_data,
                "message": "Đăng ký thành công.",
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /auth/me/"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedWithValidToken]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


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


class FirebaseTokenView(APIView):
    """POST /auth/firebase-token/"""
    permission_classes = [IsAuthenticatedWithValidToken]

    def post(self, request):
        try:
            _get_firebase_app()
            from firebase_admin import auth as firebase_auth
            uid = f"clinic_{request.user.pk}"
            additional_claims = {
                "role": request.user.role,
                "clinic_uid": request.user.pk,
                "email": request.user.email,
            }
            custom_token = firebase_auth.create_custom_token(uid, additional_claims)
            return Response({"firebase_token": custom_token.decode("utf-8")}, status=status.HTTP_200_OK)
        except ImportError:
            return Response({"detail": "Firebase chưa được cấu hình."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as exc:
            logger.exception("Lỗi Firebase token: %s", exc)
            return Response({"detail": "Không thể tạo Firebase token."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
