from django.contrib import admin
from django.template.response import TemplateResponse
from django.utils.html import mark_safe
from django.urls import path
from clinic_app.models import (
    Doctor, DoctorSchedule, MedicineCategory, Medicine, Inventory,
    Patient, Appointment, Payment,
)
from django import forms
from ckeditor_uploader.widgets import CKEditorUploadingWidget
from django.db.models import Count, Sum
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
        today = timezone.now().date()

        # Thuốc theo danh mục
        stats = MedicineCategory.objects.annotate(
            c=Count('medicines')
        ).values('id', 'name', 'c')

        # Doanh thu 7 ngày gần nhất
        revenue_by_day = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            qs = Payment.objects.filter(status='success', paid_at__date=day)
            revenue_by_day.append({
                'day': day.strftime('%d/%m'),
                'count': qs.count(),
                'total': qs.aggregate(t=Sum('amount'))['t'] or 0,
            })

        # Lịch hẹn theo trạng thái
        appointment_stats = (
            Appointment.objects.values('status')
            .annotate(c=Count('id'))
            .order_by('-c')
        )

        # Bác sĩ theo chuyên khoa
        doctor_by_specialty = (
            Doctor.objects.values('specialty__name')
            .annotate(c=Count('id'))
            .order_by('-c')
        )

        # Tổng doanh thu
        total_revenue = Payment.objects.filter(status='success').aggregate(
            t=Sum('amount')
        )['t'] or 0

        return TemplateResponse(request, 'admin/stats.html', {
            **self.each_context(request),
            'title': 'Thống kê & Báo cáo',
            'stats': stats,
            'revenue_by_day': revenue_by_day,
            'appointment_stats': appointment_stats,
            'doctor_by_specialty': doctor_by_specialty,
            'total_patients': Patient.objects.count(),
            'total_doctors': Doctor.objects.count(),
            'total_appointments': Appointment.objects.filter(status='completed').count(),
            'total_revenue': f'{total_revenue:,.0f}',
        })


# Khởi tạo trang Admin custom
admin_site = ClinicAdminSite()

# Đăng ký các models
admin_site.register(MedicineCategory)
admin_site.register(Medicine, MedicineAdmin)
admin_site.register(Doctor, DoctorAdmin)
admin_site.register(DoctorSchedule)
admin_site.register(Inventory)
admin_site.register(Patient)