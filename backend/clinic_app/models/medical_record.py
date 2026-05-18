from django.db import models
from .patient import Patient
from .doctor import Doctor
from .appointment import Appointment


class MedicalRecord(models.Model):
    patient          = models.ForeignKey(Patient, on_delete=models.CASCADE,  related_name="medical_records")
    doctor           = models.ForeignKey(Doctor,  on_delete=models.SET_NULL, null=True, related_name="medical_records")
    appointment      = models.OneToOneField(
        Appointment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="medical_record"
    )
    diagnosis        = models.TextField(help_text="Chẩn đoán")
    symptoms         = models.TextField(blank=True, help_text="Triệu chứng")
    treatment_notes  = models.TextField(blank=True, help_text="Hướng điều trị")
    follow_up_date   = models.DateField(null=True, blank=True, help_text="Ngày tái khám")
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table   = "medical_records"
        verbose_name = "Hồ sơ bệnh án"
        ordering   = ["-created_at"]

    def __str__(self):
        return f"HS#{self.pk} - {self.patient} ({self.created_at.date()})"


class TestResult(models.Model):
    """
    Kết quả cận lâm sàng — xét nghiệm + chẩn đoán hình ảnh.
    """

    class TestType(models.TextChoices):
        # Xét nghiệm
        BLOOD      = "blood",      "Xét nghiệm máu"
        URINE      = "urine",      "Xét nghiệm nước tiểu"
        STOOL      = "stool",      "Xét nghiệm phân"
        MICROBIOLOGY = "micro",    "Vi sinh / Cấy khuẩn"
        # Chẩn đoán hình ảnh
        XRAY       = "xray",       "Chụp X-quang"
        CT         = "ct",         "Chụp CT"
        MRI        = "mri",        "Chụp MRI"
        ULTRASOUND = "ultrasound", "Siêu âm"
        ENDOSCOPY  = "endoscopy",  "Nội soi"
        ECG        = "ecg",        "Điện tâm đồ (ECG)"
        # Khác
        OTHER      = "other",      "Khác"

    medical_record  = models.ForeignKey(
        MedicalRecord, on_delete=models.CASCADE, related_name="test_results"
    )
    # phân loại cận lâm sàng
    test_type       = models.CharField(
        max_length=20, choices=TestType, default=TestType.OTHER,
        help_text="Loại cận lâm sàng"
    )
    test_name       = models.CharField(max_length=255, help_text="Tên xét nghiệm/chụp chiếu cụ thể")
    result          = models.TextField(help_text="Kết quả")
    unit            = models.CharField(max_length=50, blank=True, help_text="Đơn vị (nếu có)")
    reference_range = models.CharField(max_length=100, blank=True, help_text="Khoảng tham chiếu bình thường")
    test_date       = models.DateField()
    file_attachment = models.FileField(
        upload_to="test_results/", blank=True, null=True,
        help_text="File kết quả (hình chụp, PDF...)"
    )
    
    entered_by      = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="entered_test_results",
        help_text="Nhân viên nhập kết quả"
    )

    class Meta:
        db_table   = "test_results"
        verbose_name = "Kết quả cận lâm sàng"

    def __str__(self):
        return f"[{self.get_test_type_display()}] {self.test_name} - {self.test_date}"
