"""
test_auth.py — Kiểm thử toàn bộ luồng xác thực (Authentication).

Chạy: python manage.py test clinic_app.tests.test_auth

Các luồng được test:
  ✓ Đăng ký tài khoản patient / doctor hợp lệ
  ✓ Đăng ký với email đã tồn tại → 400
  ✓ Đăng ký với role không hợp lệ → 400
  ✓ Đăng ký với password không khớp → 400
  ✓ Đăng nhập đúng → trả access + refresh token
  ✓ Đăng nhập sai mật khẩu → 401
  ✓ Refresh token hợp lệ → access token mới
  ✓ Verify token hợp lệ
  ✓ GET /auth/me/ khi đã đăng nhập
  ✓ GET /auth/me/ khi chưa đăng nhập → 401
  ✓ Đổi mật khẩu đúng luồng
  ✓ Đổi mật khẩu sai mật khẩu cũ → 400
"""

from django.urls import reverse

from .base import BaseAPITestCase, make_user, get_tokens_for_user


class RegisterTests(BaseAPITestCase):
    """POST /api/auth/register/"""

    URL = "/auth/register/"

    def test_register_patient_success(self):
        data = {
            "email": "newpatient@test.com",
            "username": "newpatient",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
            "role": "patient",
        }
        res = self.client.post(self.URL, data)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["role"], "patient")

    def test_register_doctor_success(self):
        data = {
            "email": "newdoctor@test.com",
            "username": "newdoctor",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
            "role": "doctor",
        }
        res = self.client.post(self.URL, data)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["user"]["role"], "doctor")

    def test_register_duplicate_email(self):
        """Email đã tồn tại → 400."""
        data = {
            "email": "patient@test.com",   # đã tạo trong setUpTestData
            "username": "duppatient",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
            "role": "patient",
        }
        res = self.client.post(self.URL, data)
        self.assertEqual(res.status_code, 400)

    def test_register_invalid_role(self):
        """Role không hợp lệ (admin, staff) → 400."""
        data = {
            "email": "hacker@test.com",
            "username": "hacker",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
            "role": "admin",
        }
        res = self.client.post(self.URL, data)
        self.assertEqual(res.status_code, 400)
        self.assertIn("role", res.data)

    def test_register_password_mismatch(self):
        """Mật khẩu không khớp → 400."""
        data = {
            "email": "mismatch@test.com",
            "username": "mismatch",
            "password": "Test@1234",
            "password_confirm": "Wrong@5678",
            "role": "patient",
        }
        res = self.client.post(self.URL, data)
        self.assertEqual(res.status_code, 400)

    def test_register_short_password(self):
        """Mật khẩu < 8 ký tự → 400."""
        data = {
            "email": "short@test.com",
            "username": "shortpw",
            "password": "abc",
            "password_confirm": "abc",
            "role": "patient",
        }
        res = self.client.post(self.URL, data)
        self.assertEqual(res.status_code, 400)


class LoginTests(BaseAPITestCase):
    """POST /api/auth/login/  (SimpleJWT TokenObtainPairView)"""

    URL = "/auth/login/"

    def test_login_success(self):
        res = self.client.post(self.URL, {
            "email": "patient@test.com",
            "password": "Test@1234",
        })
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_login_wrong_password(self):
        res = self.client.post(self.URL, {
            "email": "patient@test.com",
            "password": "wrongpass",
        })
        self.assertEqual(res.status_code, 401)

    def test_login_nonexistent_email(self):
        res = self.client.post(self.URL, {
            "email": "ghost@test.com",
            "password": "Test@1234",
        })
        self.assertEqual(res.status_code, 401)

    def test_login_missing_fields(self):
        res = self.client.post(self.URL, {"email": "patient@test.com"})
        self.assertEqual(res.status_code, 400)


class TokenRefreshTests(BaseAPITestCase):
    """POST /api/auth/refresh/"""

    URL = "/auth/refresh/"

    def test_refresh_success(self):
        tokens = get_tokens_for_user(self.patient_user)
        res = self.client.post(self.URL, {"refresh": tokens["refresh"]})
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)

    def test_refresh_invalid_token(self):
        res = self.client.post(self.URL, {"refresh": "bad.token.here"})
        self.assertEqual(res.status_code, 401)


class TokenVerifyTests(BaseAPITestCase):
    """POST /api/auth/verify/"""

    URL = "/auth/verify/"

    def test_verify_valid_token(self):
        tokens = get_tokens_for_user(self.patient_user)
        res = self.client.post(self.URL, {"token": tokens["access"]})
        self.assertEqual(res.status_code, 200)

    def test_verify_invalid_token(self):
        res = self.client.post(self.URL, {"token": "bad.token"})
        self.assertEqual(res.status_code, 401)


class MeViewTests(BaseAPITestCase):
    """GET / PATCH /api/auth/me/"""

    URL = "/auth/me/"

    def test_me_authenticated(self):
        self.auth(self.patient_user)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["email"], "patient@test.com")
        self.assertEqual(res.data["role"], "patient")

    def test_me_unauthenticated(self):
        """Chưa đăng nhập → 401."""
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 401)

    def test_me_admin(self):
        self.auth(self.admin)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["role"], "admin")


class ChangePasswordTests(BaseAPITestCase):
    """PUT /api/auth/change-password/"""

    URL = "/auth/change-password/"

    def test_change_password_success(self):
        # Tạo user riêng để không ảnh hưởng user khác
        user = make_user("changepw@test.com", password="OldPass@1")
        self.auth(user)
        res = self.client.put(self.URL, {
            "old_password": "OldPass@1",
            "new_password": "NewPass@2",
        })
        self.assertEqual(res.status_code, 200, res.data)
        # Kiểm tra password đã thay đổi
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewPass@2"))

    def test_change_password_wrong_old(self):
        self.auth(self.patient_user)
        res = self.client.put(self.URL, {
            "old_password": "WrongOld@1",
            "new_password": "NewPass@2",
        })
        self.assertEqual(res.status_code, 400)

    def test_change_password_unauthenticated(self):
        res = self.client.put(self.URL, {
            "old_password": "Test@1234",
            "new_password": "NewPass@2",
        })
        self.assertEqual(res.status_code, 401)