"""
clinic_app/signals.py
Auto-tạo InventoryAlert khi tồn kho thay đổi + Notification khi lịch hẹn cập nhật.
Kết nối trong apps.py → ClinicAppConfig.ready()
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone


# ─────────────────────────────────────────────
# INVENTORY — auto alert khi thấp / sắp hết hạn
# ─────────────────────────────────────────────

@receiver(post_save, sender="clinic_app.Inventory")
def check_inventory_alerts(sender, instance, **kwargs):
    """
    Sau mỗi lần save Inventory, kiểm tra:
    1. Số lượng ≤ warning_threshold → tạo LOW_STOCK alert
    2. Hết hạn trong 30 ngày        → tạo NEAR_EXPIRY alert
    """
    from .models import InventoryAlert

    # Low stock
    if instance.is_low_stock():
        InventoryAlert.objects.get_or_create(
            medicine=instance.medicine,
            inventory=instance,
            alert_type=InventoryAlert.AlertType.LOW_STOCK,
            is_resolved=False,
            defaults={
                "message": (
                    f"Thuốc '{instance.medicine.name}' (lô {instance.batch_number}) "
                    f"còn {instance.quantity} {instance.medicine.unit} "
                    f"— dưới ngưỡng cảnh báo {instance.warning_threshold}."
                )
            },
        )

    # Near expiry (30 ngày)
    if instance.is_near_expiry(days=30):
        InventoryAlert.objects.get_or_create(
            medicine=instance.medicine,
            inventory=instance,
            alert_type=InventoryAlert.AlertType.NEAR_EXPIRY,
            is_resolved=False,
            defaults={
                "message": (
                    f"Thuốc '{instance.medicine.name}' (lô {instance.batch_number}) "
                    f"hết hạn vào {instance.expiry_date} "
                    f"— còn {(instance.expiry_date - timezone.now().date()).days} ngày."
                )
            },
        )

    # Expired
    if instance.expiry_date < timezone.now().date():
        InventoryAlert.objects.get_or_create(
            medicine=instance.medicine,
            inventory=instance,
            alert_type=InventoryAlert.AlertType.EXPIRED,
            is_resolved=False,
            defaults={
                "message": (
                    f"Thuốc '{instance.medicine.name}' (lô {instance.batch_number}) "
                    f"đã hết hạn từ {instance.expiry_date}. Cần xử lý ngay!"
                )
            },
        )


# ─────────────────────────────────────────────
# APPOINTMENT — auto Notification khi status thay đổi
# ─────────────────────────────────────────────

@receiver(pre_save, sender="clinic_app.Appointment")
def cache_old_appointment_status(sender, instance, **kwargs):
    """Lưu status cũ trước khi save để so sánh."""
    if instance.pk:
        try:
            instance._old_status = sender.objects.get(pk=instance.pk).status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender="clinic_app.Appointment")
def notify_appointment_status_change(sender, instance, created, **kwargs):
    """
    Gửi Notification cho bệnh nhân khi trạng thái lịch hẹn thay đổi.
    """
    from .models import Notification

    old_status = getattr(instance, "_old_status", None)
    new_status = instance.status

    # Không làm gì nếu status không đổi hoặc là lần tạo mới (chưa có status cũ)
    if created or old_status == new_status or old_status is None:
        return

    patient_user = instance.patient.user

    STATUS_MESSAGES = {
        "confirmed": (
            Notification.Type.APPOINTMENT_CONFIRMED,
            "Lịch hẹn đã được xác nhận",
            f"Lịch hẹn với BS. {instance.doctor.full_name} vào "
            f"{instance.appointment_date.strftime('%H:%M %d/%m/%Y')} đã được xác nhận.",
        ),
        "cancelled": (
            Notification.Type.APPOINTMENT_CANCELLED,
            "Lịch hẹn đã bị hủy",
            f"Lịch hẹn với BS. {instance.doctor.full_name} vào "
            f"{instance.appointment_date.strftime('%H:%M %d/%m/%Y')} đã bị hủy.",
        ),
        "completed": (
            Notification.Type.SYSTEM,
            "Lịch hẹn hoàn thành",
            f"Buổi khám với BS. {instance.doctor.full_name} đã hoàn thành. "
            f"Vui lòng kiểm tra đơn thuốc và kết quả xét nghiệm.",
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


# ─────────────────────────────────────────────
# PRESCRIPTION — notify patient khi đơn được cấp phát
# ─────────────────────────────────────────────

@receiver(pre_save, sender="clinic_app.Prescription")
def cache_old_prescription_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_status = sender.objects.get(pk=instance.pk).status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender="clinic_app.Prescription")
def notify_prescription_dispensed(sender, instance, created, **kwargs):
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