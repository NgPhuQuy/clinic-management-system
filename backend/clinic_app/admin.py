from django.contrib import admin
from django.template.response import TemplateResponse
from django.utils.safestring import mark_safe
from django.urls import path
from clinic_app.models import (
    Doctor, DoctorSchedule, MedicineCategory, Medicine, Inventory,
    Patient, Appointment, Payment, AppointmentService, MedicalRecord,
)
from django import forms
from ckeditor_uploader.widgets import CKEditorUploadingWidget
from django.db.models import Count, Sum
from django.db.models.functions import TruncDay, ExtractYear
from django.utils import timezone
from datetime import timedelta


class MedicineForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget, required=False)

    class Meta:
        model = Medicine
        fields = '__all__'


class MedicineAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'category']
    search_fields = ['name', 'description']
    list_filter = ['category']
    form = MedicineForm


class DoctorAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'specialty']
    readonly_fields = ['avatar_preview']

    def avatar_preview(self, doctor):
        if doctor.user.avatar:
            return mark_safe(f'<img src="{doctor.user.avatar.url}" width="150" />')
        return "Chưa có ảnh"

    avatar_preview.short_description = 'Ảnh đại diện'


class ClinicAdminSite(admin.AdminSite):
    site_header = 'Hệ Thống Quản Lý Phòng Khám'

    def get_urls(self):
        return [
            path('clinic-stats/', self.admin_view(self.clinic_stats), name='clinic-stats'),
        ] + super().get_urls()

    def clinic_stats(self, request):
        current_year = timezone.now().year
        seven_days_ago = timezone.now() - timedelta(days=7)

        # ------------------------------------------------------------------
        # MỤC 1: THỐNG KÊ BỆNH NHÂN (Giới tính, Độ tuổi, Chuyên khoa)
        # ------------------------------------------------------------------
        # Theo Giới tính
        patient_gender_stats = Patient.objects.values('gender').annotate(total=Count('id'))

        # Theo Độ tuổi (Tính toán khoảng tuổi dựa trên năm sinh)
        patient_age_stats = Patient.objects.annotate(
            birth_year=ExtractYear('date_of_birth')
        ).values('birth_year').annotate(total=Count('id'))

        age_groups = {"Nhi khoa (<16)": 0, "Thanh niên (16-35)": 0, "Trung niên (36-60)": 0, "Cao tuổi (>60)": 0}
        for item in patient_age_stats:
            age = current_year - item['birth_year']
            if age < 16:
                age_groups["Nhi khoa (<16)"] += item['total']
            elif age <= 35:
                age_groups["Thanh niên (16-35)"] += item['total']
            elif age <= 60:
                age_groups["Trung niên (36-60)"] += item['total']
            else:
                age_groups["Cao tuổi (>60)"] += item['total']

        # Theo Chuyên khoa của Bác sĩ mà bệnh nhân tới khám
        patient_specialty_stats = MedicalRecord.objects.values(
            'doctor__specialty__name'
        ).annotate(total=Count('patient', distinct=True))

        # ------------------------------------------------------------------
        # MỤC 2: BÁO CÁO DỊCH VỤ Y TẾ ĐƯỢC SỬ DỤNG
        # ------------------------------------------------------------------
        service_usage_stats = AppointmentService.objects.values(
            'service__name'
        ).annotate(usage_count=Sum('quantity')).order_by('-usage_count')[:10]

        # ------------------------------------------------------------------
        # MỤC 3: TÌNH HÌNH BỆNH PHỔ BIẾN TRONG CỘNG ĐỒNG
        # ------------------------------------------------------------------
        disease_stats = MedicalRecord.objects.values('diagnosis').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        # ------------------------------------------------------------------
        # MỤC 4: BÁO CÁO DOANH THU TỔNG HỢP VÀ CHI TIẾT
        # ------------------------------------------------------------------
        total_revenue = Payment.objects.filter(status='success').aggregate(sum=Sum('amount'))['sum'] or 0

        payments_in_7_days = Payment.objects.filter(
            status='success',
            paid_at__gte=seven_days_ago
        ).values('paid_at', 'amount')
        revenue_dict = {}
        for i in range(7):
            day_str = (timezone.now() - timedelta(days=i)).strftime('%d/%m')
            revenue_dict[day_str] = 0.0

        # 4. Duyệt qua từng hóa đơn, dùng Python cộng dồn tiền vào đúng ngày của nó
        for p in payments_in_7_days:
            if p['paid_at']:
                # Ép về giờ Việt Nam rồi định dạng kiểu ngày/tháng
                local_date = timezone.localtime(p['paid_at']).strftime('%d/%m')
                if local_date in revenue_dict:
                    revenue_dict[local_date] += float(p['amount'])
        revenue_by_day = [{'day': k, 'total': v} for k, v in reversed(list(revenue_dict.items()))]
        # Đóng gói toàn bộ vào context để đẩy ra ngoài HTML
        context = {
            **self.each_context(request),
            'title': 'Báo cáo & Thống kê toàn diện',
            'total_doctors': Doctor.objects.count(),
            'total_patients': Patient.objects.count(),
            'total_revenue': total_revenue,

            'patient_gender_stats': list(patient_gender_stats),
            'age_groups_list': list(age_groups.values()),
            'patient_specialty_stats': list(patient_specialty_stats),
            'service_usage_stats': list(service_usage_stats),
            'disease_stats': list(disease_stats),
            'revenue_by_day': revenue_by_day,
        }
        return TemplateResponse(request, "admin/stats.html", context)


# Khởi tạo trang Admin custom
admin_site = ClinicAdminSite()

# Đăng ký các models
admin_site.register(MedicineCategory)
admin_site.register(Medicine, MedicineAdmin)
admin_site.register(Doctor, DoctorAdmin)
admin_site.register(DoctorSchedule)
admin_site.register(Inventory)
admin_site.register(Patient)