"""
clinic_app/signals.py

Signals:
  1. Inventory    → auto tạo InventoryAlert (LOW_STOCK / NEAR_EXPIRY / EXPIRED)
  2. Appointment  → auto Notification khi status thay đổi
  3. Appointment  → auto tạo Consultation record khi status → confirmed
  4. Prescription → auto Notification khi status → dispensed
  5. Prescription → auto trừ kho khi status → dispensed        ← THÊM MỚI
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
    from .models import InventoryAlert

    today         = timezone.now().date()
    medicine_name = instance.medicine.name
    batch         = instance.batch_number
    alert_cases   = []

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
    from .models import Consultation, Notification

    old_status = getattr(instance, "_old_status", None)
    new_status = instance.status

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

    # ── 2. Auto-tạo Consultation khi confirmed ─── FIX: thêm set room_id
    if new_status == "confirmed":
        consultation, created_c = Consultation.objects.get_or_create(
            appointment=instance,
            defaults={
                "type":   Consultation.Type.VIDEO,       # đổi sang VIDEO vì đã tích hợp Agora
                "status": Consultation.Status.WAITING,
            },
        )
        if created_c:
            # FIX: set room_id sau khi có pk
            consultation.room_id = f"clinic_consult_{consultation.pk}"
            consultation.save(update_fields=["room_id"])
            logger.info("Consultation #%s created for Appointment #%s", consultation.pk, instance.pk)


# ─────────────────────────────────────────────
# PRESCRIPTION — notify + trừ kho khi dispensed
# ─────────────────────────────────────────────

pre_save.connect(_cache_old_status, sender="clinic_app.Prescription")


@receiver(post_save, sender="clinic_app.Prescription")
def on_prescription_saved(sender, instance, created, **kwargs):
    from .models import Notification

    old_status = getattr(instance, "_old_status", None)
    if created or old_status == instance.status:
        return

    if instance.status == "dispensed":
        # ── Notification cho bệnh nhân ──
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

        # ── THÊM MỚI: Trừ kho theo từng dòng đơn thuốc ──
        _deduct_inventory(instance)


def _deduct_inventory(prescription):
    """
    Trừ kho khi đơn thuốc được cấp phát.

    Chiến lược: FEFO (First Expired First Out) —
    ưu tiên dùng lô gần hết hạn nhất trước.
    Nếu không đủ hàng → ghi log cảnh báo nhưng không raise exception
    (tránh block toàn bộ flow dispensed).
    """
    from .models import Inventory

    for detail in prescription.details.select_related("medicine").all():
        remaining = detail.quantity  # số lượng cần trừ

        # Lấy các lô còn hàng, ưu tiên lô gần hết hạn trước (FEFO)
        batches = (
            Inventory.objects
            .filter(medicine=detail.medicine, quantity__gt=0)
            .order_by("expiry_date")   # FEFO
        )

        for batch in batches:
            if remaining <= 0:
                break

            deduct = min(batch.quantity, remaining)
            batch.quantity -= deduct
            batch.save(update_fields=["quantity"])  # trigger check_inventory_alerts tự động
            remaining -= deduct

        if remaining > 0:
            # Không đủ hàng — ghi cảnh báo để admin biết
            logger.warning(
                "Prescription #%s: Thiếu %s %s %s khi cấp phát. Cần nhập thêm kho.",
                prescription.pk,
                remaining,
                detail.medicine.unit,
                detail.medicine.name,
            )