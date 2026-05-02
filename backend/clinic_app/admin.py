from django.contrib import admin
from django.template.response import TemplateResponse
from django.utils.html import mark_safe
from django.urls import path
from clinic_app.models import Doctor, DoctorSchedule, MedicineCategory, Medicine, Inventory, Patient
from django import forms
from ckeditor_uploader.widgets import CKEditorUploadingWidget
from django.db.models import Count


# Tích hợp CKEditor cho mô tả Thuốc (hoặc bạn có thể đổi sang form Bác sĩ nếu muốn)
class MedicineForm(forms.ModelForm):
    # Giả sử model Medicine có trường 'description' (mô tả/hướng dẫn sử dụng)
    description = forms.CharField(widget=CKEditorUploadingWidget, required=False)

    class Meta:
        model = Medicine
        fields = '__all__'


class MedicineAdmin(admin.ModelAdmin):
    # Thay đổi 'name', 'category' cho khớp với tên field trong model Medicine của bạn
    list_display = ['id', 'name', 'category']
    search_fields = ['name', 'description']
    list_filter = ['category']
    form = MedicineForm


class DoctorAdmin(admin.ModelAdmin):
    # Thay đổi 'name', 'specialty' cho khớp với tên field trong model Doctor
    list_display = ['id', 'full_name', 'specialty']
    readonly_fields = ['avatar_preview']

    # Giả sử model Doctor có trường ảnh tên là 'avatar' hoặc 'image'
    def avatar_preview(self, doctor):
        if hasattr(doctor, 'avatar') and doctor.avatar:
            return mark_safe(f'<img src="{doctor.avatar.url}" width="150" />')
        return "Chưa có ảnh"

    avatar_preview.short_description = 'Ảnh đại diện'


class ClinicAdminSite(admin.AdminSite):
    site_header = 'Hệ Thống Quản Lý Phòng Khám'

    def get_urls(self):
        return [
            path('clinic-stats/', self.clinic_stats),
        ] + super().get_urls()

    def clinic_stats(self, request):
        # Thống kê số lượng thuốc theo từng danh mục thuốc
        # Chú ý: chữ 'medicine' trong Count() thường là related_name hoặc tên model Medicine viết thường
        stats = MedicineCategory.objects.annotate(c=Count('medicine')).values('id', 'name', 'c')

        return TemplateResponse(request, 'admin/stats.html', {
            'stats': stats
        })


# Khởi tạo trang Admin custom
admin_site = ClinicAdminSite()

# Đăng ký các models của clinic_app vào Admin
admin_site.register(MedicineCategory)
admin_site.register(Medicine, MedicineAdmin)
admin_site.register(Doctor, DoctorAdmin)
admin_site.register(DoctorSchedule)
admin_site.register(Inventory)
admin_site.register(Patient)