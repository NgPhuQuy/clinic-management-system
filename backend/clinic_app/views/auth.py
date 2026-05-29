import base64
import json
import secrets
import urllib.parse
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.http import HttpResponse
from django.utils import timezone
from oauth2_provider.models import AccessToken, Application
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
import requests

from ..models import Patient, Notification

from ..permissions import IsAuthenticatedWithValidToken
from ..serializers import ChangePasswordSerializer, RegisterSerializer, UserSerializer

User = get_user_model()

def _deep_link(url):
    response = HttpResponse(status=302)
    response["Location"] = url
    return response

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(request, username=username, password=password)

        if not username or not password:
            return Response(
                {"detail": "Vui lòng nhập username và password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

        Notification.objects.create(
            user=user,
            title="Chào mừng bạn đến với ClinicCare!",
            message="Tài khoản của bạn đã được đăng ký thành công. Bắt đầu đặt lịch khám ngay!",
            type=Notification.Type.SYSTEM,
        )

        return Response(
            {
                "user":    UserSerializer(user).data,
                "message": "Đăng ký thành công.",
            },
            status=status.HTTP_201_CREATED,
        )


class GoogleOAuthRedirectView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        redirect_url = request.query_params.get("redirect_url", "com.clinic.app://auth")
        state = base64.urlsafe_b64encode(
            json.dumps({"redirect_url": redirect_url}).encode()
        ).decode().rstrip("=")
        params = urllib.parse.urlencode({
            "client_id":     settings.GOOGLE_CLIENT_ID,
            "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope":         "openid email profile",
            "prompt":        "select_account",
            "state":         state,
        })
        return Response({"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"})


class GoogleOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def _app_redirect(self, request):
        state = request.query_params.get("state", "")
        try:
            padded = state + "=" * (-len(state) % 4)
            data = json.loads(base64.urlsafe_b64decode(padded).decode())
            return data.get("redirect_url", "com.clinic.app://auth")
        except Exception:
            return "com.clinic.app://auth"

    def get(self, request):
        code         = request.query_params.get("code")
        error        = request.query_params.get("error")
        app_redirect = self._app_redirect(request)

        if error or not code:
            return _deep_link(f"{app_redirect}?error=access_denied")

        try:
            token_res = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code":          code,
                    "client_id":     settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
                    "grant_type":    "authorization_code",
                },
                timeout=10,
            )
            if token_res.status_code != 200:
                return _deep_link(f"{app_redirect}?error=token_exchange_failed")

            id_token = token_res.json().get("id_token")
            info_res = requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
                timeout=10,
            )
            if info_res.status_code != 200:
                return _deep_link(f"{app_redirect}?error=invalid_token")

            info       = info_res.json()
            email      = info.get("email")
            first_name = info.get("given_name", "")
            last_name  = info.get("family_name", "")

            if not email:
                return _deep_link(f"{app_redirect}?error=no_email")

        except requests.RequestException:
            return _deep_link(f"{app_redirect}?error=network_error")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username":   email.split("@")[0],
                "first_name": first_name,
                "last_name":  last_name,
                "role":       User.Role.PATIENT,
            },
        )
        if created:
            user.set_password(secrets.token_urlsafe(32))
            user.save()
            Patient.objects.create(user=user)
            Notification.objects.create(
                user=user,
                title="Chào mừng đến với ClinicCare!",
                message="Tài khoản Google của bạn đã được kết nối thành công.",
                type=Notification.Type.SYSTEM,
            )

        if not user.is_active:
            return _deep_link(f"{app_redirect}?error=account_disabled")

        app = Application.objects.filter(client_id=settings.CLIENT_ID).first()
        access_token = AccessToken.objects.create(
            user=user,
            application=app,
            token=secrets.token_urlsafe(32),
            expires=timezone.now() + timedelta(hours=1),
            scope=user.role,
        )

        params = urllib.parse.urlencode({
            "token": access_token.token,
            "scope": user.role,
        })
        return _deep_link(f"{app_redirect}?{params}")



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
