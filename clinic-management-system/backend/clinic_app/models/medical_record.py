from django.db import models
from .patient import Patient
from .doctor import Doctor
from .appointment import Appointment


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
