"""
clinic_app/signals.py

Signals:
  1. Inventory   → auto tạo InventoryAlert (LOW_STOCK / NEAR_EXPIRY / EXPIRED)
  2. Appointment → auto Notification khi status thay đổi
  3. Prescription→ auto Notification khi status → dispensed
  4. Appointment → auto tạo Consultation record khi status → confirmed

Kết nối trong apps.py → ClinicAppConfig.ready()
"""
import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Helper: cache old status (dùng chung cho nhiều model)
# ─────────────────────────────────────────────

def _cache_old_status(sender, instance, **kwargs):
    """
    Lưu status cũ vào instance._old_status trước khi save.
    Gắn vào pre_save của bất kỳ model nào có trường `status`.
    """
    if instance.pk:
        try:
            instance._old_status = sender.objects.get(pk=instance.pk).status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


# ─────────────────────────────────────────────
# INVENTORY — auto alert khi thấp / sắp hết hạn / hết hạn
# ─────────────────────────────────────────────

@receiver(post_save, sender="clinic_app.Inventory")
def check_inventory_alerts(sender, instance, **kwargs):
    """
    Sau mỗi lần save Inventory, kiểm tra:
      - Số lượng ≤ warning_threshold → LOW_STOCK
      - Hết hạn trong 30 ngày        → NEAR_EXPIRY
      - Đã hết hạn                   → EXPIRED
    """
    from .models import InventoryAlert

    today = timezone.now().date()
    medicine_name = instance.medicine.name
    batch = instance.batch_number

    alert_cases = []

    if instance.is_low_stock():
        alert_cases.append((
            InventoryAlert.AlertType.LOW_STOCK,
            (
                f"Thuốc '{medicine_name}' (lô {batch}) còn {instance.quantity} "
                f"{instance.medicine.unit} — dưới ngưỡng {instance.warning_threshold}."
            ),
        ))

    if instance.expiry_date < today:
        alert_cases.append((
            InventoryAlert.AlertType.EXPIRED,
            f"Thuốc '{medicine_name}' (lô {batch}) đã hết hạn từ {instance.expiry_date}. Cần xử lý ngay!",
        ))
    elif instance.is_near_expiry(days=30):
        days_left = (instance.expiry_date - today).days
        alert_cases.append((
            InventoryAlert.AlertType.NEAR_EXPIRY,
            f"Thuốc '{medicine_name}' (lô {batch}) hết hạn vào {instance.expiry_date} — còn {days_left} ngày.",
        ))

    for alert_type, message in alert_cases:
        InventoryAlert.objects.get_or_create(
            medicine=instance.medicine,
            inventory=instance,
            alert_type=alert_type,
            is_resolved=False,
            defaults={"message": message},
        )


# ─────────────────────────────────────────────
# APPOINTMENT — cache status + notify + auto Consultation
# ─────────────────────────────────────────────

pre_save.connect(_cache_old_status, sender="clinic_app.Appointment")


@receiver(post_save, sender="clinic_app.Appointment")
def on_appointment_saved(sender, instance, created, **kwargs):
    """
    Hai việc sau mỗi lần save Appointment:
      1. Gửi Notification cho bệnh nhân khi status thay đổi.
      2. Tự tạo Consultation record khi status → confirmed.
    """
    from .models import Consultation, Notification

    old_status = getattr(instance, "_old_status", None)
    new_status = instance.status

    # Không làm gì nếu status không thay đổi
    if created or old_status == new_status or old_status is None:
        return

    patient_user = instance.patient.user

    # ── 1. Notification ──────────────────────
    STATUS_MESSAGES = {
        "confirmed": (
            Notification.Type.APPOINTMENT_CONFIRMED,
            "Lịch hẹn đã được xác nhận",
            (
                f"Lịch hẹn với BS. {instance.doctor.full_name} vào "
                f"{instance.appointment_date.strftime('%H:%M %d/%m/%Y')} đã được xác nhận."
            ),
        ),
        "cancelled": (
            Notification.Type.APPOINTMENT_CANCELLED,
            "Lịch hẹn đã bị hủy",
            (
                f"Lịch hẹn với BS. {instance.doctor.full_name} vào "
                f"{instance.appointment_date.strftime('%H:%M %d/%m/%Y')} đã bị hủy."
            ),
        ),
        "completed": (
            Notification.Type.SYSTEM,
            "Lịch hẹn hoàn thành",
            (
                f"Buổi khám với BS. {instance.doctor.full_name} đã hoàn thành. "
                f"Vui lòng kiểm tra đơn thuốc và kết quả xét nghiệm."
            ),
        ),
    }

    if new_status in STATUS_MESSAGES:
        notif_type, title, message = STATUS_MESSAGES[new_status]
        Notification.objects.create(
            user=patient_user,
            title=title,
            message=message,
            type=notif_type,
            related_object_id=instance.pk,
        )

    # ── 2. Auto-tạo Consultation khi confirmed ─
    if new_status == "confirmed":
        consultation, created_c = Consultation.objects.get_or_create(
            appointment=instance,
            defaults={"type": Consultation.Type.CHAT, "status": Consultation.Status.WAITING},
        )
        if created_c:
            logger.info("Consultation #%s created for Appointment #%s", consultation.pk, instance.pk)


# ─────────────────────────────────────────────
# PRESCRIPTION — notify khi dispensed
# ─────────────────────────────────────────────

pre_save.connect(_cache_old_status, sender="clinic_app.Prescription")


@receiver(post_save, sender="clinic_app.Prescription")
def on_prescription_saved(sender, instance, created, **kwargs):
    from .models import Notification

    old_status = getattr(instance, "_old_status", None)
    if created or old_status == instance.status:
        return

    if instance.status == "dispensed":
        Notification.objects.create(
            user=instance.patient.user,
            title="Đơn thuốc đã sẵn sàng",
            message=(
                f"Đơn thuốc #{instance.pk} của bạn đã được cấp phát. "
                f"Vui lòng đến nhận thuốc tại quầy dược."
            ),
            type=Notification.Type.PRESCRIPTION_READY,
            related_object_id=instance.pk,
        )