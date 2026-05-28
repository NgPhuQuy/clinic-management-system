import logging

import requests
from django.db.models import Sum
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Consultation, Notification, InventoryAlert

logger = logging.getLogger(__name__)


def _send_push(user, title, body, data=None):
    push_token = getattr(user, "push_token", None)
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return
    try:
        requests.post(
            "https://exp.host/--/api/v2/push/send",
            json={
                "to":        push_token,
                "title":     title,
                "body":      body,
                "data":      data or {},
                "sound":     "default",
                "channelId": "default",
            },
            timeout=5,
        )
    except Exception as exc:
        logger.warning("Push notification failed for user %s: %s", user.pk, exc)


def _cache_old_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_status = sender.objects.get(pk=instance.pk).status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender="clinic_app.Inventory")
def check_inventory_alerts(sender, instance, **kwargs):
    today         = timezone.now().date()
    medicine      = instance.medicine
    medicine_name = medicine.name
    batch         = instance.batch_number

    total_valid = (
        medicine.inventory_batches
        .filter(expiry_date__gt=today)
        .aggregate(total=Sum("quantity"))["total"]
        or 0
    )

    if total_valid <= medicine.warning_threshold:
        msg = (
            f"Thuốc '{medicine_name}' còn tổng {total_valid} {medicine.unit} "
            f"— dưới ngưỡng {medicine.warning_threshold}."
        )
        InventoryAlert.objects.get_or_create(
            medicine=medicine,
            inventory=None,
            alert_type=InventoryAlert.AlertType.LOW_STOCK,
            is_resolved=False,
            defaults={"message": msg},
        )
    else:
        InventoryAlert.objects.filter(
            medicine=medicine,
            alert_type=InventoryAlert.AlertType.LOW_STOCK,
            is_resolved=False,
        ).update(is_resolved=True, resolved_at=timezone.now())

    if instance.expiry_date < today:
        InventoryAlert.objects.get_or_create(
            medicine=medicine,
            inventory=instance,
            alert_type=InventoryAlert.AlertType.EXPIRED,
            is_resolved=False,
            defaults={
                "message": f"Thuốc '{medicine_name}' (lô {batch}) đã hết hạn từ {instance.expiry_date}. Cần xử lý ngay!",
            },
        )
    elif instance.is_near_expiry(days=30):
        days_left = (instance.expiry_date - today).days
        InventoryAlert.objects.get_or_create(
            medicine=medicine,
            inventory=instance,
            alert_type=InventoryAlert.AlertType.NEAR_EXPIRY,
            is_resolved=False,
            defaults={
                "message": f"Thuốc '{medicine_name}' (lô {batch}) hết hạn vào {instance.expiry_date} — còn {days_left} ngày.",
            },
        )


pre_save.connect(_cache_old_status, sender="clinic_app.Appointment")


@receiver(post_save, sender="clinic_app.Appointment")
def on_appointment_saved(sender, instance, created, **kwargs):
    old_status = getattr(instance, "_old_status", None)
    new_status = instance.status

    if created or old_status == new_status or old_status is None:
        return

    patient_user = instance.patient.user
    doctor_name  = instance.doctor.user.get_full_name()

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


pre_save.connect(_cache_old_status, sender="clinic_app.Prescription")


@receiver(post_save, sender="clinic_app.Prescription")
def on_prescription_saved(sender, instance, created, **kwargs):
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


pre_save.connect(_cache_old_status, sender="clinic_app.Payment")


@receiver(post_save, sender="clinic_app.Payment")
def on_payment_saved(sender, instance, created, **kwargs):
    old_status = getattr(instance, "_old_status", None)
    if created or old_status == instance.status:
        return

    if instance.status == "success":
        try:
            appointment  = instance.invoice.appointment
            patient_user = appointment.patient.user
        except Exception:
            return

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
