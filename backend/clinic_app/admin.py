from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.db.models import Count, Sum
from django.urls import path
from django.template.response import TemplateResponse
from django.utils import timezone
from datetime import timedelta

from .models import (
    User, Specialty, Service, Patient, Doctor, DoctorSchedule,
    Appointment, AppointmentService, MedicalRecord, TestResult,
    MedicineCategory, Medicine, Inventory, InventoryAlert,
    Prescription, PrescriptionDetail, Payment,
    Consultation, ChatMessage, Notification,
)


# ─── Customize Admin Site ────────────────────────────────────────────────────

admin.site.site_header  = "Phòng Khám Đa Khoa - Trang quản trị"
admin.site.site_title   = "Clinic Admin"
admin.site.index_title  = "Bảng Điều Khiển Quản Trị"


# ─── User ────────────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ("email", "username", "role", "is_active", "created_at")
    list_filter     = ("role", "is_active", "is_staff")
    search_fields   = ("email", "username")
    ordering        = ("-created_at",)
    readonly_fields = ("created_at",)

    fieldsets = (
        ("Thông tin đăng nhập", {"fields": ("email", "username", "password")}),
        ("Vai trò & Trạng thái", {"fields": ("role", "is_active", "is_staff", "is_superuser")}),
        ("OAuth",               {"fields": ("oauth_provider", "oauth_uid"), "classes": ("collapse",)}),
        ("Thời gian",           {"fields": ("created_at",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "username", "role", "password1", "password2"),
        }),
    )


# ─── Specialty & Service ─────────────────────────────────────────────────────

class ServiceInline(admin.TabularInline):
    model  = Service
    extra  = 1
    fields = ("name", "price", "is_active")

@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display  = ("name", "is_active", "doctor_count", "service_count")
    list_filter   = ("is_active",)
    search_fields = ("name",)
    inlines       = [ServiceInline]

    def doctor_count(self, obj):
        return obj.doctors.count()
    doctor_count.short_description = "Số bác sĩ"

    def service_count(self, obj):
        return obj.services.count()
    service_count.short_description = "Số dịch vụ"


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display  = ("name", "specialty", "price", "is_active")
    list_filter   = ("specialty", "is_active")
    search_fields = ("name",)


# ─── Doctor ──────────────────────────────────────────────────────────────────

class DoctorScheduleInline(admin.TabularInline):
    model  = DoctorSchedule
    extra  = 0
    fields = ("date", "start_time", "end_time", "max_appointments", "is_available")

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display  = ("full_name", "specialty", "license_number",
                     "experience_years", "consultation_fee", "is_available")
    list_filter   = ("specialty", "is_available")
    search_fields = ("full_name", "license_number")
    inlines       = [DoctorScheduleInline]
    readonly_fields = ("user",)


@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    list_display = ("doctor", "date", "start_time", "end_time",
                    "max_appointments", "is_available")
    list_filter  = ("is_available", "date")
    search_fields = ("doctor__full_name",)


# ─── Patient ─────────────────────────────────────────────────────────────────

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display  = ("full_name", "gender", "date_of_birth", "phone",
                     "blood_type", "insurance_number")
    list_filter   = ("gender", "blood_type")
    search_fields = ("full_name", "phone", "insurance_number")
    readonly_fields = ("user",)


# ─── Appointment ─────────────────────────────────────────────────────────────

class AppointmentServiceInline(admin.TabularInline):
    model  = AppointmentService
    extra  = 0
    fields = ("service", "quantity", "price_at_time")
    readonly_fields = ("price_at_time",)

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display   = ("id", "patient", "doctor", "appointment_date",
                      "colored_status", "created_at")
    list_filter    = ("status", "doctor__specialty", "appointment_date")
    search_fields  = ("patient__full_name", "doctor__full_name")
    date_hierarchy = "appointment_date"
    inlines        = [AppointmentServiceInline]
    readonly_fields = ("created_at", "updated_at")

    STATUS_COLORS = {
        "pending":   "#f0ad4e",
        "confirmed": "#5bc0de",
        "completed": "#5cb85c",
        "cancelled": "#d9534f",
        "no_show":   "#aaa",
    }

    def colored_status(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#333")
        return format_html(
            '<span style="color:white;background:{};padding:3px 8px;'
            'border-radius:4px;font-size:12px">{}</span>',
            color, obj.get_status_display()
        )
    colored_status.short_description = "Trạng thái"


# ─── Medical Record ──────────────────────────────────────────────────────────

class TestResultInline(admin.StackedInline):
    model  = TestResult
    extra  = 0
    fields = ("test_name", "result", "unit", "reference_range", "test_date")

@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display   = ("id", "patient", "doctor", "diagnosis", "created_at", "follow_up_date")
    list_filter    = ("doctor__specialty", "created_at")
    search_fields  = ("patient__full_name", "doctor__full_name", "diagnosis")
    date_hierarchy = "created_at"
    inlines        = [TestResultInline]
    readonly_fields = ("created_at", "updated_at")


# ─── Medicine & Inventory ────────────────────────────────────────────────────

class InventoryInline(admin.TabularInline):
    model  = Inventory
    extra  = 0
    fields = ("batch_number", "quantity", "expiry_date", "supplier", "warning_threshold")

    def get_queryset(self, request):
        return super().get_queryset(request).order_by("expiry_date")

@admin.register(MedicineCategory)
class MedicineCategoryAdmin(admin.ModelAdmin):
    list_display  = ("name", "medicine_count")
    search_fields = ("name",)

    def medicine_count(self, obj):
        return obj.medicines.count()
    medicine_count.short_description = "Số thuốc"


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display  = ("code", "name", "category", "unit", "price",
                     "requires_prescription", "is_active", "total_stock")
    list_filter   = ("category", "requires_prescription", "is_active")
    search_fields = ("code", "name", "generic_name")
    inlines       = [InventoryInline]

    def total_stock(self, obj):
        total = sum(i.quantity for i in obj.inventory_batches.all())
        color = "red" if total < 20 else "green"
        return format_html('<b style="color:{}">{}</b>', color, total)
    total_stock.short_description = "Tồn kho"


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display  = ("medicine", "batch_number", "quantity", "expiry_date",
                     "supplier", "low_stock_badge", "near_expiry_badge")
    list_filter   = ("supplier", "expiry_date")
    search_fields = ("medicine__name", "batch_number")

    def low_stock_badge(self, obj):
        if obj.is_low_stock():
            return format_html('<span style="color:red">⚠️ Sắp hết</span>')
        return "✅ Đủ"
    low_stock_badge.short_description = "Tồn kho"

    def near_expiry_badge(self, obj):
        if obj.is_near_expiry():
            return format_html('<span style="color:orange">⚠️ Sắp hết hạn</span>')
        return "✅ Còn hạn"
    near_expiry_badge.short_description = "Hạn dùng"


# ─── Prescription ────────────────────────────────────────────────────────────

class PrescriptionDetailInline(admin.TabularInline):
    model  = PrescriptionDetail
    extra  = 0
    fields = ("medicine", "quantity", "dosage", "frequency", "duration_days", "price_at_time")

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display  = ("id", "patient", "doctor", "status", "created_at")
    list_filter   = ("status",)
    search_fields = ("patient__full_name", "doctor__full_name")
    inlines       = [PrescriptionDetailInline]
    readonly_fields = ("created_at",)


# ─── Payment ─────────────────────────────────────────────────────────────────

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display   = ("id", "patient", "amount_display", "payment_method",
                      "colored_status", "paid_at")
    list_filter    = ("status", "payment_method")
    search_fields  = ("patient__full_name", "transaction_id")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)

    def amount_display(self, obj):
        return f"{obj.amount:,.0f} đ"
    amount_display.short_description = "Số tiền"

    def colored_status(self, obj):
        colors = {"success": "#5cb85c", "pending": "#f0ad4e",
                  "failed": "#d9534f", "refunded": "#aaa"}
        color = colors.get(obj.status, "#333")
        return format_html(
            '<span style="color:white;background:{};padding:2px 8px;border-radius:4px">{}</span>',
            color, obj.get_status_display()
        )
    colored_status.short_description = "Trạng thái"


# ─── Notification ────────────────────────────────────────────────────────────

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ("title", "user", "type", "is_read", "created_at")
    list_filter   = ("type", "is_read")
    search_fields = ("user__email", "title")
    date_hierarchy = "created_at"


# ─── Custom Admin Stats View ─────────────────────────────────────────────────

class ClinicAdminSite(admin.AdminSite):
    def get_urls(self):
        urls = super().get_urls()
        custom = [path("stats/", self.admin_view(self.stats_view), name="stats")]
        return custom + urls

    def stats_view(self, request):
        today = timezone.now().date()
        cards = [
            {"label": "Bệnh nhân",  "value": Patient.objects.count(),     "color": "#417690"},
            {"label": "Bác sĩ",     "value": Doctor.objects.count(),       "color": "#2e7d32"},
            {"label": "Lịch hẹn HT","value": Appointment.objects.filter(status="completed").count(), "color": "#6a1b9a"},
            {"label": "Doanh thu",  "value": f"{Payment.objects.filter(status='success').aggregate(t=Sum('amount'))['t'] or 0:,.0f}đ", "color": "#c62828"},
        ]
        revenue_by_day = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            qs = Payment.objects.filter(status="success", paid_at__date=day)
            revenue_by_day.append({
                "day": day.strftime("%d/%m"),
                "count": qs.count(),
                "total": qs.aggregate(t=Sum("amount"))["t"] or 0,
            })
        return TemplateResponse(request, "admin/stats.html", {
            **self.each_context(request),
            "cards": cards,
            "revenue_by_day": revenue_by_day,
            "title": "Thống kê",
        })