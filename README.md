# Phòng Khám Đa Khoa Trực Tuyến — Backend API

Django REST Framework + OAuth2

---

## Cấu trúc project

```
clinic-management-system/
├── backend/
│   ├── clinic_app/                  ← App chính
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   └── admin.py
│   ├── clinic_management_system/    ← Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── .env.example
│   ├── manage.py
│   └── requirement.txt
└── frontend/
    └── clinic-app/                  ← React Native (Expo)
```

---

## Setup & Chạy

### 1. Cài dependencies

```bash
cd backend

python -m venv .venv
.venv\Scripts\activate

pip install -r requirement.txt
```

### 2. Cấu hình .env

```bash
cp .env.example .env
# Sửa .env theo môi trường của bạn
```

`.env` cần có các biến:

```env
DB_NAME=clinic_db
DB_USER=root
DB_PASSWORD=yourpassword
SECRET_KEY=your-secret-key-here
```

### 3. Migrate & chạy server

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

---

## Test API

### Swagger UI

```
http://localhost:8000/swagger/
```

### Đăng nhập lấy token

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"patient1@gmail.com","password":"patient123"}'
```

Response:
```json
{
  "access":  "eyJhbGc...",
  "refresh": "eyJhbGc..."
}
```

### Gọi API có auth

```bash
# Lấy danh sách bác sĩ
curl http://localhost:8000/api/doctors/ \
  -H "Authorization: Bearer <access_token>"

# Đặt lịch hẹn
curl -X POST http://localhost:8000/api/appointments/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": 1,
    "schedule": 1,
    "appointment_date": "2025-12-20T09:00:00",
    "reason": "Đau ngực, khó thở"
  }'
```

---

## Tài khoản test

| Email | Password | Role |
|---|---|---|
| admin@clinic.com | admin123 | Admin |
| doctor1@clinic.com | doctor123 | Bác sĩ Tim mạch |
| doctor2@clinic.com | doctor123 | Bác sĩ Da liễu |
| patient1@gmail.com | patient123 | Bệnh nhân |
| staff@clinic.com | staff123 | Nhân viên |

---

## Danh sách API (45+ endpoints)

| Method | URL | Mô tả |
|---|---|---|
| POST | /api/auth/register/ | Đăng ký |
| POST | /api/auth/login/ | Đăng nhập |
| POST | /api/auth/refresh/ | Làm mới token |
| GET | /api/auth/me/ | Thông tin user hiện tại |
| PUT | /api/auth/change-password/ | Đổi mật khẩu |
| GET | /api/specialties/ | Danh sách chuyên khoa |
| GET | /api/services/ | Danh sách dịch vụ |
| GET | /api/doctors/ | Danh sách bác sĩ |
| GET | /api/doctors/{id}/schedules/ | Lịch trống của bác sĩ |
| GET | /api/doctors/{id}/appointments/ | Lịch hẹn của bác sĩ |
| GET | /api/patients/{id}/medical_records/ | Hồ sơ bệnh án |
| POST | /api/appointments/ | Đặt lịch hẹn |
| PATCH | /api/appointments/{id}/status/ | Cập nhật trạng thái |
| POST | /api/medical-records/ | Tạo hồ sơ bệnh án |
| POST | /api/medical-records/{id}/add_test_result/ | Thêm kết quả xét nghiệm |
| POST | /api/prescriptions/ | Kê đơn thuốc |
| POST | /api/prescriptions/{id}/dispense/ | Cấp phát thuốc (trừ kho) |
| GET | /api/medicines/ | Danh sách thuốc |
| GET | /api/inventory/ | Xem tồn kho |
| GET | /api/inventory/low_stock/ | Thuốc sắp hết |
| GET | /api/inventory/near_expiry/ | Thuốc sắp hết hạn |
| POST | /api/payments/init/ | Khởi tạo thanh toán |
| POST | /api/payments/{id}/confirm/ | Xác nhận thanh toán |
| GET | /api/notifications/ | Thông báo của tôi |
| POST | /api/notifications/read-all/ | Đánh dấu tất cả đã đọc |
| GET | /api/admin/dashboard/ | Thống kê tổng hợp |
| ... | | Xem đầy đủ tại /swagger/ |
