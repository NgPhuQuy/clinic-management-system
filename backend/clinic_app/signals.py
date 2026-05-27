import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Helper: gửi Expo push notification
# ─────────────────────────────────────────────

def _send_push(user, title, body, data=None):
    push_token = getattr(user, "push_token", None)
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return
    try:
        import requests as _req
        _req.post(
            "https://exp.host/--/api/v2/push/send",
            json={
                "to":    push_token,
                "title": title,
                "body":  body,
                "data":  data or {},
                "sound": "default",
            },
            timeout=5,
        )
    except Exception as exc:
        logger.warning("Push notification failed for user %s: %s", user.pk, exc)


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

    doctor_name = instance.doctor.user.get_full_name()
    STATUS_MESSAGES = {
        "confirmed": (
            Notification.Type.APPOINTMENT_CONFIRMED,
            "Lịch hẹn đã được xác nhận",
            (
                f"Lịch hẹn với BS. {doctor_name} vào "
                f"{instance.appointment_date.strftime('%H:%M %d/%m/%Y')} đã được xác nhận."
            ),
        ),
        "cancelled": (
            Notification.Type.APPOINTMENT_CANCELLED,
            "Lịch hẹn đã bị hủy",
            (
                f"Lịch hẹn với BS. {doctor_name} vào "
                f"{instance.appointment_date.strftime('%H:%M %d/%m/%Y')} đã bị hủy."
            ),
        ),
        "in_progress": (
            Notification.Type.SYSTEM,
            "Bác sĩ đang sẵn sàng",
            f"Bác sĩ {doctor_name} đang tiếp nhận ca khám của bạn.",
        ),
        "completed": (
            Notification.Type.SYSTEM,
            "Lịch hẹn hoàn thành",
            (
                f"Buổi khám với BS. {doctor_name} đã hoàn thành. "
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
        _send_push(patient_user, title, message, data={"appointment_id": instance.pk})

    # Auto-tạo Consultation khi confirmed
    if new_status == "confirmed":
        consultation, created_c = Consultation.objects.get_or_create(
            appointment=instance,
            defaults={
                "type":   Consultation.Type.CHAT,
                "status": Consultation.Status.WAITING,
            },
        )
        if created_c:
            consultation.room_id = f"clinic_consult_{consultation.pk}"
            consultation.save(update_fields=["room_id"])
            logger.info(
                "Consultation #%s created for Appointment #%s",
                consultation.pk, instance.pk,
            )


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
        title   = "Đơn thuốc đã sẵn sàng"
        message = (
            f"Đơn thuốc #{instance.pk} của bạn đã được cấp phát. "
            f"Vui lòng đến nhận thuốc tại quầy dược."
        )
        patient_user = instance.medical_record.patient.user
        Notification.objects.create(
            user=patient_user,
            title=title,
            message=message,
            type=Notification.Type.PRESCRIPTION_READY,
            related_object_id=instance.pk,
        )
        _send_push(patient_user, title, message, data={"prescription_id": instance.pk})
        logger.info("Prescription #%s dispensed — notification sent to patient.", instance.pk)


# ─────────────────────────────────────────────
# PAYMENT — notify khi thanh toán thành công
# ─────────────────────────────────────────────

pre_save.connect(_cache_old_status, sender="clinic_app.Payment")


@receiver(post_save, sender="clinic_app.Payment")
def on_payment_saved(sender, instance, created, **kwargs):
    from .models import Notification

    old_status = getattr(instance, "_old_status", None)
    if created or old_status == instance.status:
        return

    if instance.status == "success":
        try:
            appointment  = instance.invoice.appointment
            patient_user = appointment.patient.user
        except Exception:
            return

        # Auto-confirm appointment nếu đang ở trạng thái pending
        if appointment.status == "pending":
            appointment.status = "confirmed"
            appointment.save(update_fields=["status"])
            logger.info(
                "Appointment #%s auto-confirmed after Payment #%s success.",
                appointment.pk, instance.pk,
            )

        amount  = f"{int(instance.amount):,}đ".replace(",", ".")
        title   = "Thanh toán thành công"
        message = (
            f"Đã thanh toán {amount} qua {instance.get_payment_method_display()}. "
            f"Mã giao dịch: {instance.transaction_id or instance.pk}."
        )
        Notification.objects.create(
            user=patient_user,
            title=title,
            message=message,
            type=Notification.Type.PAYMENT_SUCCESS,
            related_object_id=instance.pk,
        )
        _send_push(patient_user, title, message, data={"payment_id": instance.pk})
        logger.info("Payment #%s success — notification sent to patient.", instance.pk)
