# Phòng Khám Đa Khoa Trực Tuyến — Backend API

Django REST Framework + SimpleJWT + OAuth2

---

## Cấu trúc project

```
clinic_project/
├── config/                  ← Django project config
│   ├── settings.py
│   ├── urls.py              (config_urls.py)
│   └── wsgi.py
├── clinic/                  ← App chính
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── permissions.py
│   ├── admin.py
│   ├── pipeline.py          ← OAuth2 pipeline
│   └── management/
│       └── commands/
│           └── seed.py
├── requirements.txt
├── .env                     (copy từ .env.example)
└── manage.py
```

---

## Setup & Chạy

### 1. Tạo project

```bash
# Tạo virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Cài dependencies
pip install -r requirements.txt

# Tạo Django project
django-admin startproject config .
python manage.py startapp clinic
```

### 2. Copy files

Sau khi tải các file về, copy vào đúng vị trí:

```
models.py       → clinic/models.py
serializers.py  → clinic/serializers.py
views.py        → clinic/views.py
urls.py         → clinic/urls.py
permissions.py  → clinic/permissions.py
admin.py        → clinic/admin.py
pipeline.py     → clinic/pipeline.py
settings.py     → config/settings.py
config_urls.py  → config/urls.py
seed.py         → clinic/management/commands/seed.py
```

Tạo thư mục management:
```bash
mkdir -p clinic/management/commands
touch clinic/management/__init__.py
touch clinic/management/commands/__init__.py
```

### 3. Cấu hình .env

```bash
cp .env.example .env
# Sửa .env theo môi trường của bạn
```

### 4. Migrate & Seed

```bash
python manage.py makemigrations clinic
python manage.py migrate

# Tạo dữ liệu mẫu
python manage.py seed
```

### 5. Chạy server

```bash
python manage.py runserver
```

---

## Test API

### Swagger UI
```
http://localhost:8000/api/docs/
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
    "appointment_date": "2024-12-20T09:00:00",
    "reason": "Đau ngực, khó thở"
  }'
```

---

## Tài khoản test (sau khi seed)

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
| GET | /api/auth/me/ | Thông tin user |
| GET | /api/specialties/ | Danh sách chuyên khoa |
| GET | /api/doctors/ | Danh sách bác sĩ |
| GET | /api/doctors/{id}/schedules/ | Lịch trống bác sĩ |
| POST | /api/appointments/ | Đặt lịch |
| PATCH | /api/appointments/{id}/status/ | Cập nhật trạng thái |
| POST | /api/medical-records/ | Tạo hồ sơ bệnh án |
| POST | /api/prescriptions/{id}/dispense/ | Cấp phát thuốc |
| POST | /api/payments/init/ | Khởi tạo thanh toán |
| GET | /api/inventory/low_stock/ | Thuốc sắp hết |
| GET | /api/admin/dashboard/ | Thống kê tổng hợp |
| ... | | Xem đầy đủ tại /api/docs/ |