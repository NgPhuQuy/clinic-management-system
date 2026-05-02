from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from cloudinary.models import CloudinaryField

# ─────────────────────────────────────────────
# USER & AUTH
# ─────────────────────────────────────────────

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser, PermissionsMixin):
    class Role(models.TextChoices):
        PATIENT = "patient", "Bệnh nhân"
        DOCTOR = "doctor", "Bác sĩ"
        STAFF = "staff", "Nhân viên y tế"
        ADMIN = "admin", "Quản trị viên"

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    role = models.CharField(max_length=20, choices=Role, default=Role.PATIENT)
    avatar = CloudinaryField(null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    # OAuth2 / Social login
    oauth_provider = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="facebook | google | None"
    )
    oauth_uid = models.CharField(max_length=255, blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = UserManager()

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='clinic_user_groups',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='clinic_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    class Meta:
        db_table = "users"
        verbose_name = "Người dùng"

    def __str__(self):
        return f"{self.email} ({self.role})"


# ─────────────────────────────────────────────
# CHUYÊN KHOA & DỊCH VỤ
# ─────────────────────────────────────────────

class Specialty(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    icon = CloudinaryField(null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "specialties"
        verbose_name = "Chuyên khoa"

    def __str__(self):
        return self.name


class Service(models.Model):
    specialty = models.ForeignKey(
        Specialty, on_delete=models.SET_NULL, null=True, related_name="services"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "services"
        verbose_name = "Dịch vụ y tế"

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
# BỆNH NHÂN
# ─────────────────────────────────────────────

class Patient(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Nam"
        FEMALE = "female", "Nữ"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="patient_profile")
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    insurance_number = models.CharField(max_length=50, blank=True)
    blood_type = models.CharField(max_length=5, blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "patients"
        verbose_name = "Bệnh nhân"

    def __str__(self):
        return self.full_name


# ─────────────────────────────────────────────
# BÁC SĨ
# ─────────────────────────────────────────────

class Doctor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctor_profile")
    specialty = models.ForeignKey(
        Specialty, on_delete=models.SET_NULL, null=True, related_name="doctors"
    )
    full_name = models.CharField(max_length=255)
    license_number = models.CharField(max_length=100, unique=True)
    experience_years = models.PositiveIntegerField(default=0)
    consultation_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bio = models.TextField(blank=True)
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = "doctors"
        verbose_name = "Bác sĩ"

    def __str__(self):
        return f"BS. {self.full_name} - {self.specialty}"


# ─────────────────────────────────────────────
# LỊCH LÀM VIỆC BÁC SĨ
# ─────────────────────────────────────────────

class DoctorSchedule(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="schedules")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    max_appointments = models.PositiveIntegerField(default=10)
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = "doctor_schedules"
        verbose_name = "Lịch làm việc"
        unique_together = ("doctor", "date", "start_time")

    def __str__(self):
        return f"{self.doctor} | {self.date} {self.start_time}-{self.end_time}"


# ─────────────────────────────────────────────
# LỊCH HẸN
# ─────────────────────────────────────────────

class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Chờ xác nhận"
        CONFIRMED = "confirmed", "Đã xác nhận"
        CANCELLED = "cancelled", "Đã hủy"
        COMPLETED = "completed", "Hoàn thành"
        NO_SHOW = "no_show", "Không đến"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="appointments")
    schedule = models.ForeignKey(
        DoctorSchedule, on_delete=models.SET_NULL, null=True, related_name="appointments"
    )
    appointment_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    reason = models.TextField(blank=True, help_text="Lý do khám")
    notes = models.TextField(blank=True, help_text="Ghi chú thêm")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "appointments"
        verbose_name = "Lịch hẹn"
        ordering = ["-appointment_date"]

    def __str__(self):
        return f"{self.patient} → {self.doctor} | {self.appointment_date}"


class AppointmentService(models.Model):
    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE, related_name="appointment_services"
    )
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    price_at_time = models.DecimalField(
        max_digits=12, decimal_places=2, help_text="Giá tại thời điểm đặt"
    )

    class Meta:
        db_table = "appointment_services"
        verbose_name = "Dịch vụ trong lịch hẹn"

    def get_subtotal(self):
        return self.quantity * self.price_at_time


# ─────────────────────────────────────────────
# HỒ SƠ BỆNH ÁN
# ─────────────────────────────────────────────

class MedicalRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="medical_records")
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name="medical_records")
    appointment = models.OneToOneField(
        Appointment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="medical_record"
    )
    diagnosis = models.TextField(help_text="Chẩn đoán")
    symptoms = models.TextField(blank=True, help_text="Triệu chứng")
    treatment_notes = models.TextField(blank=True, help_text="Hướng điều trị")
    follow_up_date = models.DateField(null=True, blank=True, help_text="Ngày tái khám")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medical_records"
        verbose_name = "Hồ sơ bệnh án"
        ordering = ["-created_at"]

    def __str__(self):
        return f"HS#{self.pk} - {self.patient} ({self.created_at.date()})"


class TestResult(models.Model):
    medical_record = models.ForeignKey(
        MedicalRecord, on_delete=models.CASCADE, related_name="test_results"
    )
    test_name = models.CharField(max_length=255)
    result = models.TextField()
    unit = models.CharField(max_length=50, blank=True)
    reference_range = models.CharField(max_length=100, blank=True)
    test_date = models.DateField()
    file_attachment = models.FileField(upload_to="test_results/", blank=True, null=True)

    class Meta:
        db_table = "test_results"
        verbose_name = "Kết quả xét nghiệm"

    def __str__(self):
        return f"{self.test_name} - {self.test_date}"


# ─────────────────────────────────────────────
# DƯỢC PHẨM & KHO THUỐC
# ─────────────────────────────────────────────

class MedicineCategory(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "medicine_categories"
        verbose_name = "Danh mục thuốc"

    def __str__(self):
        return self.name


class Medicine(models.Model):
    category = models.ForeignKey(
        MedicineCategory, on_delete=models.SET_NULL, null=True, related_name="medicines"
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    generic_name = models.CharField(max_length=255, blank=True, help_text="Tên hoạt chất")
    unit = models.CharField(max_length=50, help_text="Đơn vị: viên, ml, gói...")
    price = models.DecimalField(max_digits=12, decimal_places=2)
    requires_prescription = models.BooleanField(default=False, help_text="Cần kê đơn")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "medicines"
        verbose_name = "Thuốc"

    def __str__(self):
        return f"{self.code} - {self.name}"


class Inventory(models.Model):
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="inventory_batches")
    batch_number = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=0, help_text="Số lượng tồn kho")
    expiry_date = models.DateField()
    import_date = models.DateField(default=timezone.now)
    import_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    supplier = models.CharField(max_length=255, blank=True)
    warning_threshold = models.PositiveIntegerField(
        default=10, help_text="Ngưỡng cảnh báo số lượng thấp"
    )

    class Meta:
        db_table = "inventory"
        verbose_name = "Tồn kho thuốc"
        unique_together = ("medicine", "batch_number")

    def is_low_stock(self):
        return self.quantity <= self.warning_threshold

    def is_near_expiry(self, days=30):
        from datetime import date, timedelta
        return self.expiry_date <= date.today() + timedelta(days=days)

    def __str__(self):
        return f"{self.medicine.name} | Lô: {self.batch_number} | SL: {self.quantity}"


class InventoryAlert(models.Model):
    class AlertType(models.TextChoices):
        LOW_STOCK = "low_stock", "Sắp hết hàng"
        NEAR_EXPIRY = "near_expiry", "Sắp hết hạn"
        EXPIRED = "expired", "Đã hết hạn"

    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="alerts")
    inventory = models.ForeignKey(
        Inventory, on_delete=models.CASCADE, null=True, blank=True, related_name="alerts"
    )
    alert_type = models.CharField(max_length=20, choices=AlertType)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "inventory_alerts"
        verbose_name = "Cảnh báo kho thuốc"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.alert_type}] {self.medicine.name}"


# ─────────────────────────────────────────────
# ĐƠN THUỐC
# ─────────────────────────────────────────────

class Prescription(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Chờ cấp phát"
        DISPENSED = "dispensed", "Đã cấp phát"
        CANCELLED = "cancelled", "Đã hủy"

    medical_record = models.OneToOneField(
        MedicalRecord, on_delete=models.CASCADE, related_name="prescription"
    )
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name="prescriptions")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="prescriptions")
    status = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    dispensed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "prescriptions"
        verbose_name = "Đơn thuốc"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Đơn thuốc #{self.pk} - {self.patient}"


class PrescriptionDetail(models.Model):
    prescription = models.ForeignKey(
        Prescription, on_delete=models.CASCADE, related_name="details"
    )
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name="prescription_details")
    quantity = models.PositiveIntegerField()
    dosage = models.CharField(max_length=100, help_text="Liều dùng mỗi lần, vd: 1 viên")
    frequency = models.CharField(max_length=100, help_text="Số lần/ngày, vd: 3 lần/ngày")
    duration_days = models.PositiveIntegerField(help_text="Số ngày dùng thuốc")
    instructions = models.TextField(blank=True, help_text="Hướng dẫn sử dụng")
    price_at_time = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "prescription_details"
        verbose_name = "Chi tiết đơn thuốc"

    def get_subtotal(self):
        return self.quantity * self.price_at_time

    def __str__(self):
        return f"{self.medicine.name} x{self.quantity}"


# ─────────────────────────────────────────────
# THANH TOÁN
# ─────────────────────────────────────────────

class Payment(models.Model):
    class Method(models.TextChoices):
        MOMO = "momo", "MoMo"
        VNPAY = "vnpay", "VNPay"
        CREDIT_CARD = "credit_card", "Thẻ tín dụng"
        CASH = "cash", "Tiền mặt"
        BANKING = "banking", "Chuyển khoản"

    class Status(models.TextChoices):
        PENDING = "pending", "Chờ thanh toán"
        SUCCESS = "success", "Thành công"
        FAILED = "failed", "Thất bại"
        REFUNDED = "refunded", "Đã hoàn tiền"

    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="payment"
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=Method)
    status = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    transaction_id = models.CharField(max_length=255, blank=True, help_text="Mã giao dịch từ cổng TT")
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payments"
        verbose_name = "Thanh toán"
        ordering = ["-created_at"]

    def __str__(self):
        return f"TT#{self.pk} - {self.patient} - {self.amount:,.0f}đ [{self.status}]"


# ─────────────────────────────────────────────
# TƯ VẤN TRỰC TUYẾN
# ─────────────────────────────────────────────

class Consultation(models.Model):
    class Type(models.TextChoices):
        VIDEO = "video", "Video call"
        CHAT = "chat", "Chat"

    class Status(models.TextChoices):
        WAITING = "waiting", "Chờ kết nối"
        ACTIVE = "active", "Đang diễn ra"
        ENDED = "ended", "Đã kết thúc"

    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="consultation"
    )
    type = models.CharField(max_length=10, choices=Type, default=Type.CHAT)
    room_url = models.URLField(blank=True, help_text="URL phòng video call")
    room_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=10, choices=Status, default=Status.WAITING)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "consultations"
        verbose_name = "Tư vấn trực tuyến"

    def get_duration_minutes(self):
        if self.started_at and self.ended_at:
            delta = self.ended_at - self.started_at
            return round(delta.total_seconds() / 60, 1)
        return None

    def __str__(self):
        return f"[{self.type}] {self.appointment} - {self.status}"


class ChatMessage(models.Model):
    consultation = models.ForeignKey(
        Consultation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    message = models.TextField()
    attachment = models.FileField(upload_to="chat_attachments/", blank=True, null=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = "chat_messages"
        verbose_name = "Tin nhắn tư vấn"
        ordering = ["sent_at"]

    def __str__(self):
        return f"{self.sender} → {self.sent_at}"


# ─────────────────────────────────────────────
# THÔNG BÁO
# ─────────────────────────────────────────────

class Notification(models.Model):
    class Type(models.TextChoices):
        APPOINTMENT_REMINDER = "appointment_reminder", "Nhắc lịch hẹn"
        APPOINTMENT_CONFIRMED = "appointment_confirmed", "Xác nhận lịch hẹn"
        APPOINTMENT_CANCELLED = "appointment_cancelled", "Hủy lịch hẹn"
        PRESCRIPTION_READY = "prescription_ready", "Đơn thuốc sẵn sàng"
        PAYMENT_SUCCESS = "payment_success", "Thanh toán thành công"
        INVENTORY_ALERT = "inventory_alert", "Cảnh báo kho thuốc"
        SYSTEM = "system", "Hệ thống"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=50, choices=Type, default=Type.SYSTEM)
    is_read = models.BooleanField(default=False)
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        verbose_name = "Thông báo"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user}"