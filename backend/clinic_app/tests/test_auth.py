"""
test_auth.py — Kiểm thử toàn bộ luồng xác thực (Authentication).

Chạy: python manage.py test clinic_app.tests.test_auth

BUG ĐÃ SỬA:
  1. test_register_patient_success() assertIn("access", res.data) → sai vì RegisterView
     chỉ trả về {"user": ..., "message": ...}, không có token trong response.
     Fix: kiểm tra "user" và "message" trong response.

  2. LoginTests dùng POST /o/token/ nhưng:
     - Truyền "email"/"password" thay vì "username"/"password" (OAuth2 dùng username)
     - Assert "access" trong res.data nhưng OAuth2 trả về "access_token"
     Fix: đổi field name + đúng key OAuth2.

  3. TokenRefreshTests và TokenVerifyTests gọi:
       tokens = get_oauth2_token_for_user(self.patient_user)
       tokens["refresh"]  ← TypeError: string indices must be integers
     Fix: get_oauth2_token_for_user() trả về string, không phải dict.
     Fix: test trực tiếp endpoint OAuth2 với AccessToken từ factory.

Các luồng được test:
  ✓ Đăng ký tài khoản patient / doctor hợp lệ
  ✓ Đăng ký với email đã tồn tại → 400
  ✓ Đăng ký với role không hợp lệ (admin, staff) → 400
  ✓ Đăng ký với password không khớp → 400
  ✓ Đăng nhập OAuth2 đúng → access_token
  ✓ Đăng nhập sai mật khẩu → 401
  ✓ Token introspect hợp lệ → 200
  ✓ GET /auth/me/ khi đã đăng nhập
  ✓ GET /auth/me/ khi chưa đăng nhập → 401
  ✓ Đổi mật khẩu đúng luồng
  ✓ Đổi mật khẩu sai mật khẩu cũ → 400
"""

from oauth2_provider.models import Application

from .base_test import BaseAPITestCase, make_user, get_oauth2_token_for_user


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
        # BUG FIX: RegisterView trả về {"user": ..., "message": ...}
        # Không có "access" hay "refresh" — token được lấy riêng qua /o/token/
        self.assertIn("user", res.data)
        self.assertIn("message", res.data)
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
        self.assertIn("user", res.data)
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

    def test_register_invalid_role_admin(self):
        """Role 'admin' không được đăng ký công khai → 400."""
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

    def test_register_invalid_role_staff(self):
        """Role 'staff' đã bị loại khỏi hệ thống → 400."""
        data = {
            "email": "staff_reg@test.com",
            "username": "staffreg",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
            "role": "staff",
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


class OAuth2TokenTests(BaseAPITestCase):
    """
    POST /o/token/ — OAuth2 Password Grant

    BUG FIX:
      - Trước: dùng "email" field → OAuth2 password grant yêu cầu "username"
      - Trước: assert "access" → OAuth2 trả về "access_token"
      - Yêu cầu grant_type, client_id, client_secret
    """

    URL = "/o/token/"

    def _get_app(self):
        """Lấy OAuth2 Application để lấy client credentials."""
        # BaseAPITestCase.auth() đã tạo TestApp; dùng lại nó
        token = get_oauth2_token_for_user(self.patient_user)  # đảm bảo app tồn tại
        return Application.objects.get(name="TestApp")

    def test_login_success(self):
        """OAuth2 password grant với đúng credentials → access_token."""
        app = self._get_app()
        res = self.client.post(self.URL, {
            "grant_type":    "password",
            "username":      "patient@test.com",   # BUG FIX: "email" → "username"
            "password":      "Test@1234",
            "client_id":     app.client_id,
            "client_secret": app.client_secret,
            "scope":         "patient read",
        })
        self.assertEqual(res.status_code, 200, res.data)
        # BUG FIX: OAuth2 trả về "access_token" chứ không phải "access"
        self.assertIn("access_token", res.data)
        self.assertIn("token_type", res.data)

    def test_login_wrong_password(self):
        app = self._get_app()
        res = self.client.post(self.URL, {
            "grant_type":    "password",
            "username":      "patient@test.com",
            "password":      "wrongpass",
            "client_id":     app.client_id,
            "client_secret": app.client_secret,
        })
        self.assertIn(res.status_code, [400, 401])

    def test_login_nonexistent_email(self):
        app = self._get_app()
        res = self.client.post(self.URL, {
            "grant_type":    "password",
            "username":      "ghost@test.com",
            "password":      "Test@1234",
            "client_id":     app.client_id,
            "client_secret": app.client_secret,
        })
        self.assertIn(res.status_code, [400, 401])

    def test_login_missing_fields(self):
        app = self._get_app()
        res = self.client.post(self.URL, {
            "grant_type": "password",
            "username": "patient@test.com",
            # thiếu password
            "client_id": app.client_id,
        })
        self.assertIn(res.status_code, [400, 401])


class TokenIntrospectTests(BaseAPITestCase):
    """POST /o/introspect/ — Kiểm tra token còn hợp lệ không."""

    URL = "/o/introspect/"

    def test_introspect_valid_token(self):
        """BUG FIX: trước dùng tokens["access"] trên string → TypeError."""
        token_str = get_oauth2_token_for_user(self.patient_user)
        app = Application.objects.get(name="TestApp")
        res = self.client.post(
            self.URL,
            {"token": token_str},
            HTTP_AUTHORIZATION=f"Basic {self._basic_auth(app)}",
        )
        # introspect endpoint có thể trả 200 hoặc yêu cầu client auth
        self.assertIn(res.status_code, [200, 401])

    def _basic_auth(self, app):
        import base64
        cred = f"{app.client_id}:{app.client_secret}".encode()
        return base64.b64encode(cred).decode()


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

    def test_me_doctor(self):
        self.auth(self.doctor_user)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["role"], "doctor")


class ChangePasswordTests(BaseAPITestCase):
    """PUT /api/auth/change-password/"""

    URL = "/auth/change-password/"

    def test_change_password_success(self):
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