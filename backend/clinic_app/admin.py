import json
from datetime import timedelta

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count, Sum
from django.db.models.functions import ExtractYear
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe

try:
    from ckeditor_uploader.widgets import CKEditorUploadingWidget
    HAS_CKEDITOR = True
except ImportError:
    HAS_CKEDITOR = False

from clinic_app.models import (
    User, Specialty, Service,
    Doctor, DoctorSchedule,
    Patient,
    Staff,
    Appointment, AppointmentService,
    MedicalRecord, TestResult,
    MedicineCategory, Medicine, Inventory, InventoryAlert,
    Prescription, PrescriptionDetail,
    Payment,
    Consultation, ChatMessage,
    Notification,
)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER — tính nhanh các KPI dùng cho cả index lẫn stats page
# ─────────────────────────────────────────────────────────────────────────────

def _quick_stats():
    today          = timezone.now()
    month_start    = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    seven_days_ago = today - timedelta(days=7)

    total_revenue  = Payment.objects.filter(status="success").aggregate(s=Sum("amount"))["s"] or 0
    month_revenue  = Payment.objects.filter(status="success", paid_at__gte=month_start).aggregate(s=Sum("amount"))["s"] or 0
    week_revenue   = Payment.objects.filter(status="success", paid_at__gte=seven_days_ago).aggregate(s=Sum("amount"))["s"] or 0

    return {
        "total_doctors":  Doctor.objects.count(),
        "total_patients": Patient.objects.count(),
        "total_appts":    Appointment.objects.count(),
        "pending_appts":  Appointment.objects.filter(status="pending").count(),
        "today_appts":    Appointment.objects.filter(appointment_date__date=today.date()).count(),
        "total_revenue":  total_revenue,
        "month_revenue":  month_revenue,
        "week_revenue":   week_revenue,
        "low_stock":      Inventory.objects.filter(quantity__lte=10).count(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOM ADMIN SITE
# ─────────────────────────────────────────────────────────────────────────────

class ClinicAdminSite(admin.AdminSite):
    site_header = "Phòng Khám Đa Khoa — Quản Trị"
    site_title  = "Clinic Admin"
    index_title = "Bảng Điều Khiển"
    site_url    = None   # ẩn nút "Xem trang"

    def index(self, request, extra_context=None):
        """Dashboard chính — cung cấp data cho 4 tab."""
        extra_context = extra_context or {}
        extra_context.update(_quick_stats())
        extra_context.update(self._index_tab_data())
        return super().index(request, extra_context)

    def _index_tab_data(self):
        """Tính toàn bộ data cần thiết cho 4 tab trên dashboard."""
        today           = timezone.now()
        current_year    = today.year
        seven_days_ago  = today - timedelta(days=7)
        thirty_days_ago = today - timedelta(days=30)

        rev7d = {(today - timedelta(days=i)).strftime("%d/%m"): 0.0 for i in range(6, -1, -1)}
        for p in Payment.objects.filter(status="success", paid_at__gte=seven_days_ago).values("paid_at", "amount"):
            if p["paid_at"]:
                lbl = timezone.localtime(p["paid_at"]).strftime("%d/%m")
                if lbl in rev7d:
                    rev7d[lbl] += float(p["amount"])

        rev30d = {(today - timedelta(days=i)).strftime("%d/%m"): 0.0 for i in range(29, -1, -1)}
        for p in Payment.objects.filter(status="success", paid_at__gte=thirty_days_ago).values("paid_at", "amount"):
            if p["paid_at"]:
                lbl = timezone.localtime(p["paid_at"]).strftime("%d/%m")
                if lbl in rev30d:
                    rev30d[lbl] += float(p["amount"])

        method_qs = (Payment.objects.filter(status="success")
            .values("payment_method").annotate(total=Sum("amount")).order_by("-total"))

        appt_map = {s: 0 for s in ["pending","confirmed","in_progress","completed","cancelled","no_show"]}
        for row in Appointment.objects.values("status").annotate(count=Count("id")):
            if row["status"] in appt_map:
                appt_map[row["status"]] = row["count"]

        gender_map = {"male": 0, "female": 0, "other": 0}
        for row in Patient.objects.values("gender").annotate(total=Count("id")):
            key = row["gender"] or "other"
            if key in gender_map:
                gender_map[key] = row["total"]

        upcoming_appts = (Appointment.objects
            .filter(appointment_date__gte=today, status__in=["pending","confirmed"])
            .select_related("patient__user", "doctor__user")
            .order_by("appointment_date")[:10])

        recent_payments = (Payment.objects.select_related("invoice__appointment__patient__user").order_by("-created_at")[:10])


        # ── Tab 4: Kho thuốc ──────────────────────────────────────────────
        low_stock_items = (Inventory.objects
            .select_related("medicine")
            .filter(quantity__lte=20)
            .order_by("quantity")[:15])

        return {
            # Stats charts JSON
            "rev7d_labels_json":       json.dumps(list(rev7d.keys())),
            "rev7d_data_json":         json.dumps(list(rev7d.values())),
            "rev30d_labels_json":      json.dumps(list(rev30d.keys())),
            "rev30d_data_json":        json.dumps(list(rev30d.values())),
            "method_labels_json":      json.dumps([r["payment_method"] for r in method_qs]),
            "method_data_json":        json.dumps([float(r["total"]) for r in method_qs]),
            "appt_status_labels_json": json.dumps(["Chờ xác nhận","Đã xác nhận","Đang khám","Hoàn thành","Đã hủy","Không đến"]),
            "appt_status_data_json":   json.dumps([appt_map[k] for k in ["pending","confirmed","in_progress","completed","cancelled","no_show"]]),
            "gender_labels_json":      json.dumps(["Nam", "Nữ", "Khác"]),
            "gender_data_json":        json.dumps([gender_map["male"], gender_map["female"], gender_map["other"]]),
            # Tab data
            "upcoming_appts":   upcoming_appts,
            "recent_payments":  recent_payments,
            "low_stock_items":  low_stock_items,
        }

    def get_urls(self):
        custom = [
            path("clinic-stats/", self.admin_view(self.clinic_stats_view),
                 name="clinic-stats"),
        ]
        return custom + super().get_urls()

    # ------------------------------------------------------------------
    # /admin/clinic-stats/  — biểu đồ chi tiết
    # ------------------------------------------------------------------
    def clinic_stats_view(self, request):
        today           = timezone.now()
        current_year    = today.year
        seven_days_ago  = today - timedelta(days=7)
        thirty_days_ago = today - timedelta(days=30)

        # 1a. Giới tính bệnh nhân
        gender_map = {"male": 0, "female": 0, "other": 0}
        for row in Patient.objects.values("gender").annotate(total=Count("id")):
            key = row["gender"] or "other"
            if key in gender_map:
                gender_map[key] = row["total"]

        # 1b. Độ tuổi
        age_groups = {
            "Nhi khoa (<16)": 0, "Thanh niên (16–35)": 0,
            "Trung niên (36–60)": 0, "Cao tuổi (>60)": 0,
        }
        for row in Patient.objects.annotate(
            birth_year=ExtractYear("date_of_birth")
        ).values("birth_year").annotate(total=Count("id")):
            age = current_year - (row["birth_year"] or current_year)
            if age < 16:
                age_groups["Nhi khoa (<16)"] += row["total"]
            elif age <= 35:
                age_groups["Thanh niên (16–35)"] += row["total"]
            elif age <= 60:
                age_groups["Trung niên (36–60)"] += row["total"]
            else:
                age_groups["Cao tuổi (>60)"] += row["total"]

        # 1c. Bệnh nhân theo chuyên khoa
        specialty_qs = (MedicalRecord.objects
            .values("doctor__specialty__name")
            .annotate(total=Count("patient", distinct=True))
            .order_by("-total")[:8])

        # 2. Dịch vụ sử dụng
        service_qs = (AppointmentService.objects
            .values("service__name")
            .annotate(usage_count=Sum("quantity"))
            .order_by("-usage_count")[:10])

        # 3. Bệnh phổ biến
        disease_qs = (MedicalRecord.objects
            .values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")[:10])

        # 4a. Doanh thu 7 ngày
        rev7d = {(today - timedelta(days=i)).strftime("%d/%m"): 0.0 for i in range(6, -1, -1)}
        for p in Payment.objects.filter(status="success", paid_at__gte=seven_days_ago).values("paid_at", "amount"):
            if p["paid_at"]:
                lbl = timezone.localtime(p["paid_at"]).strftime("%d/%m")
                if lbl in rev7d:
                    rev7d[lbl] += float(p["amount"])

        # 4b. Doanh thu 30 ngày
        rev30d = {(today - timedelta(days=i)).strftime("%d/%m"): 0.0 for i in range(29, -1, -1)}
        for p in Payment.objects.filter(status="success", paid_at__gte=thirty_days_ago).values("paid_at", "amount"):
            if p["paid_at"]:
                lbl = timezone.localtime(p["paid_at"]).strftime("%d/%m")
                if lbl in rev30d:
                    rev30d[lbl] += float(p["amount"])

        # 4c. Phương thức thanh toán
        method_qs = (Payment.objects.filter(status="success")
            .values("payment_method").annotate(total=Sum("amount")).order_by("-total"))

        # 5. Lịch hẹn theo trạng thái
        appt_map = {s: 0 for s in ["pending","confirmed","in_progress","completed","cancelled","no_show"]}
        for row in Appointment.objects.values("status").annotate(count=Count("id")):
            if row["status"] in appt_map:
                appt_map[row["status"]] = row["count"]

        # 6. Tồn kho thấp
        low_stock_list = (Inventory.objects.filter(quantity__lte=10)
            .select_related("medicine").order_by("quantity")[:10])

        context = {
            **self.each_context(request),
            "title": "Báo Cáo & Thống Kê Toàn Diện",
            **_quick_stats(),
            "gender_labels_json":      json.dumps(["Nam", "Nữ", "Khác"]),
            "gender_data_json":        json.dumps([gender_map["male"], gender_map["female"], gender_map["other"]]),
            "age_labels_json":         json.dumps(list(age_groups.keys())),
            "age_data_json":           json.dumps(list(age_groups.values())),
            "specialty_labels_json":   json.dumps([r["doctor__specialty__name"] or "Chưa xác định" for r in specialty_qs]),
            "specialty_data_json":     json.dumps([r["total"] for r in specialty_qs]),
            "service_labels_json":     json.dumps([r["service__name"] for r in service_qs]),
            "service_data_json":       json.dumps([r["usage_count"] for r in service_qs]),
            "disease_labels_json":     json.dumps([(r["diagnosis"] or "")[:40] for r in disease_qs]),
            "disease_data_json":       json.dumps([r["count"] for r in disease_qs]),
            "rev7d_labels_json":       json.dumps(list(rev7d.keys())),
            "rev7d_data_json":         json.dumps(list(rev7d.values())),
            "rev30d_labels_json":      json.dumps(list(rev30d.keys())),
            "rev30d_data_json":        json.dumps(list(rev30d.values())),
            "method_labels_json":      json.dumps([r["payment_method"] for r in method_qs]),
            "method_data_json":        json.dumps([float(r["total"]) for r in method_qs]),
            "appt_status_labels_json": json.dumps(["Chờ xác nhận","Đã xác nhận","Đang khám","Hoàn thành","Đã hủy","Không đến"]),
            "appt_status_data_json":   json.dumps([appt_map[k] for k in ["pending","confirmed","in_progress","completed","cancelled","no_show"]]),
            "low_stock_list": low_stock_list,
        }
        return TemplateResponse(request, "admin/stats.html", context)


admin_site = ClinicAdminSite(name="clinic_admin")


@admin.register(User, site=admin_site)
class UserAdmin(BaseUserAdmin):
    list_display  = ("id", "email", "get_display_name", "role", "is_active", "is_staff", "date_joined")
    list_filter   = ("role", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    ordering      = ("-date_joined",)
    fieldsets = (
        (None,               {"fields": ("username", "email", "password")}),
        ("Thông tin cá nhân",{"fields": ("first_name", "last_name", "avatar")}),
        ("Vai trò & OAuth",  {"fields": ("role", "oauth_provider", "oauth_uid")}),
        ("Quyền hạn",        {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Thời gian",        {"fields": ("last_login", "date_joined"), "classes": ("collapse",)}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("username", "email", "password1", "password2", "role")}),
    )

    def get_display_name(self, obj):
        return obj.get_full_name() or "—"
    get_display_name.short_description = "Họ tên"


@admin.register(Specialty, site=admin_site)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display  = ("id", "name", "is_active")
    list_filter   = ("is_active",)
    search_fields = ("name",)


@admin.register(Service, site=admin_site)
class ServiceAdmin(admin.ModelAdmin):
    list_display  = ("id", "name", "specialty", "price", "is_active")
    list_filter   = ("is_active", "specialty")
    search_fields = ("name",)


class _MedicineForm(forms.ModelForm):
    if HAS_CKEDITOR:
        description = forms.CharField(widget=CKEditorUploadingWidget(), required=False)
    class Meta:
        model  = Medicine
        fields = "__all__"


@admin.register(MedicineCategory, site=admin_site)
class MedicineCategoryAdmin(admin.ModelAdmin):
    list_display  = ("id", "name")
    search_fields = ("name",)


@admin.register(Medicine, site=admin_site)
class MedicineAdmin(admin.ModelAdmin):
    list_display  = ("id", "name", "category", "unit", "price")
    list_filter   = ("category",)
    search_fields = ("name",)
    form          = _MedicineForm


@admin.register(Inventory, site=admin_site)
class InventoryAdmin(admin.ModelAdmin):
    list_display  = ("id", "medicine", "quantity", "expiry_date", "stock_badge")
    list_filter   = ("expiry_date",)
    search_fields = ("medicine__name",)
    ordering      = ("quantity",)

    def stock_badge(self, obj):
        if obj.quantity <= 0:
            return mark_safe('<span style="color:red;font-weight:bold">⛔ Hết hàng</span>')
        if obj.quantity <= 10:
            return format_html(
                '<span style="color:orange;font-weight:bold">⚠️ Sắp hết ({} còn lại)</span>',
                obj.quantity,
            )
        return mark_safe('<span style="color:green">✅ Đủ hàng</span>')
    stock_badge.short_description = "Trạng thái kho"


@admin.register(InventoryAlert, site=admin_site)
class InventoryAlertAdmin(admin.ModelAdmin):
    list_display  = ("id", "inventory", "alert_type", "is_resolved", "created_at")
    list_filter   = ("alert_type", "is_resolved")


@admin.register(Patient, site=admin_site)
class PatientAdmin(admin.ModelAdmin):
    list_display        = ("id", "full_name", "gender", "date_of_birth", "blood_type")
    list_filter         = ("gender", "blood_type")
    search_fields       = ("user__first_name", "user__last_name", "user__email")
    list_select_related = ("user",)

    def full_name(self, obj):
        return obj.user.get_full_name() or obj.user.email
    full_name.short_description = "Họ tên"


@admin.register(Staff, site=admin_site)
class StaffAdmin(admin.ModelAdmin):
    list_display        = ("id", "employee_id", "full_name", "position", "department", "phone", "avatar_preview")
    list_filter         = ("position", "department")
    search_fields       = ("user__first_name", "user__last_name", "user__email", "employee_id")
    readonly_fields     = ("employee_id", "avatar_preview")
    list_select_related = ("user", "department")

    def full_name(self, obj):
        return obj.user.get_full_name() or obj.user.email
    full_name.short_description = "Họ tên"

    def avatar_preview(self, obj):
        if obj.user.avatar:
            return mark_safe(
                f'<img src="{obj.user.avatar.url}" width="80" '
                f'style="border-radius:50%;border:2px solid #ddd"/>'
            )
        return "Chưa có ảnh"
    avatar_preview.short_description = "Ảnh đại diện"


@admin.register(Doctor, site=admin_site)
class DoctorAdmin(admin.ModelAdmin):
    list_display        = ("id", "full_name", "specialty", "experience_years", "avatar_preview")
    list_filter         = ("specialty",)
    search_fields       = ("user__first_name", "user__last_name", "user__email")
    readonly_fields     = ("avatar_preview",)
    list_select_related = ("user", "specialty")

    def full_name(self, obj):
        return obj.user.get_full_name() or obj.user.email
    full_name.short_description = "Họ tên bác sĩ"

    def avatar_preview(self, obj):
        if obj.user.avatar:
            return mark_safe(
                f'<img src="{obj.user.avatar.url}" width="80" '
                f'style="border-radius:50%;border:2px solid #ddd"/>'
            )
        return "Chưa có ảnh"
    avatar_preview.short_description = "Ảnh đại diện"


@admin.register(DoctorSchedule, site=admin_site)
class DoctorScheduleAdmin(admin.ModelAdmin):
    list_display  = ("id", "doctor", "date", "start_time", "end_time", "is_available")
    list_filter   = ("is_available", "date")
    search_fields = ("doctor__user__first_name", "doctor__user__last_name")


@admin.register(Appointment, site=admin_site)
class AppointmentAdmin(admin.ModelAdmin):
    list_display        = ("id", "patient_name", "doctor_name", "appointment_date", "status_badge")
    list_filter         = ("status",)
    search_fields       = ("patient__user__email", "doctor__user__email")
    ordering            = ("-appointment_date",)
    list_select_related = ("patient__user", "doctor__user")

    STATUS_COLORS = {
        "pending":     "#f59e0b",
        "confirmed":   "#3b82f6",
        "in_progress": "#8b5cf6",
        "completed":   "#10b981",
        "cancelled":   "#ef4444",
        "no_show":     "#6b7280",
    }

    def patient_name(self, obj):
        return obj.patient.user.get_full_name() or obj.patient.user.email
    patient_name.short_description = "Bệnh nhân"

    def doctor_name(self, obj):
        return obj.doctor.user.get_full_name() or obj.doctor.user.email
    doctor_name.short_description = "Bác sĩ"

    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#999")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = "Trạng thái"


@admin.register(AppointmentService, site=admin_site)
class AppointmentServiceAdmin(admin.ModelAdmin):
    list_display  = ("id", "appointment", "service", "quantity", "price_at_time")
    search_fields = ("service__name",)


@admin.register(MedicalRecord, site=admin_site)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display        = ("id", "patient_name", "doctor_name", "diagnosis", "created_at")
    list_filter         = ("follow_up_date",)
    search_fields       = ("diagnosis", "patient__user__email", "doctor__user__email")
    date_hierarchy      = "follow_up_date"
    list_select_related = ("patient__user", "doctor__user")

    def patient_name(self, obj):
        return obj.patient.user.get_full_name() or obj.patient.user.email
    patient_name.short_description = "Bệnh nhân"

    def doctor_name(self, obj):
        if obj.doctor is None:
            return "—"
        return obj.doctor.user.get_full_name() or obj.doctor.user.email
    doctor_name.short_description = "Bác sĩ"


@admin.register(TestResult, site=admin_site)
class TestResultAdmin(admin.ModelAdmin):
    list_display  = ("id", "medical_record", "test_type", "test_name", "test_date", "entered_by")
    list_filter   = ("test_type", "test_date")
    search_fields = ("test_name", "medical_record__patient__user__email")


@admin.register(Prescription, site=admin_site)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display  = ("id", "medical_record", "created_at", "notes")
    search_fields = ("medical_record__patient__user__email",)


@admin.register(PrescriptionDetail, site=admin_site)
class PrescriptionDetailAdmin(admin.ModelAdmin):
    list_display  = ("id", "prescription", "medicine", "quantity", "dosage")
    search_fields = ("medicine__name",)


@admin.register(Payment, site=admin_site)
class PaymentAdmin(admin.ModelAdmin):
    list_display        = ("id", "patient_name", "amount_display", "payment_method", "status_badge", "paid_at")
    list_filter         = ("status", "payment_method")
    search_fields       = ("patient__user__email", "transaction_id")
    ordering            = ("-created_at",)
    list_select_related = ("invoice__appointment__patient__user",)

    def patient_name(self, obj):
        u = obj.invoice.appointment.patient.user
        return u.get_full_name()
    patient_name.short_description = "Bệnh nhân"

    def amount_display(self, obj):
        return format_html("<strong>{} đ</strong>", f"{obj.amount:,.0f}")
    amount_display.short_description = "Số tiền"

    def status_badge(self, obj):
        colors = {"success": "#10b981", "pending": "#f59e0b", "failed": "#ef4444", "refunded": "#6b7280"}
        c = colors.get(obj.status, "#999")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">{}</span>',
            c, obj.get_status_display()
        )
    status_badge.short_description = "Trạng thái"


@admin.register(Consultation, site=admin_site)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ("id", "appointment", "type", "status", "started_at")
    list_filter  = ("type", "status")


@admin.register(ChatMessage, site=admin_site)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display  = ("id", "consultation", "sender", "is_read", "sent_at")
    list_filter   = ("is_read",)
    search_fields = ("sender__email",)


@admin.register(Notification, site=admin_site)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ("id", "user", "type", "title", "is_read", "created_at")
    list_filter   = ("type", "is_read")
    search_fields = ("user__email", "title")


# ─────────────────────────────────────────────────────────────────────────────
# OAUTH2 PROVIDER
# ─────────────────────────────────────────────────────────────────────────────

try:
    from oauth2_provider.models import Application, AccessToken, RefreshToken, Grant
    from oauth2_provider.admin import (
        ApplicationAdmin  as _OA,
        AccessTokenAdmin  as _OAT,
        RefreshTokenAdmin as _ORT,
        GrantAdmin        as _OG,
    )
    admin_site.register(Application,  _OA)
    admin_site.register(AccessToken,  _OAT)
    admin_site.register(RefreshToken, _ORT)
    admin_site.register(Grant,        _OG)
    try:
        from oauth2_provider.models import IDToken
        from oauth2_provider.admin import IDTokenAdmin as _OIT
        admin_site.register(IDToken, _OIT)
    except (ImportError, AttributeError):
        pass
except ImportError:
    pass