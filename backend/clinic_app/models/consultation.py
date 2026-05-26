from django.db import models
from .user import User
from .appointment import Appointment


class Consultation(models.Model):
    class Type(models.TextChoices):
        VIDEO = "video", "Video call"
        CHAT  = "chat",  "Chat"

    class Status(models.TextChoices):
        WAITING = "waiting", "Chờ kết nối"
        ACTIVE  = "active",  "Đang diễn ra"
        ENDED   = "ended",   "Đã kết thúc"

    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name="consultation")
    type        = models.CharField(max_length=10, choices=Type, default=Type.CHAT)
    room_url    = models.URLField(blank=True, help_text="URL phòng video call")
    room_id     = models.CharField(max_length=255, blank=True)
    status      = models.CharField(max_length=10, choices=Status, default=Status.WAITING)
    started_at  = models.DateTimeField(null=True, blank=True)
    ended_at    = models.DateTimeField(null=True, blank=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = "consultations"
        verbose_name        = "Tư vấn trực tuyến"
        verbose_name_plural = "Tư vấn trực tuyến"
        ordering = ["-id"]

    def get_duration_minutes(self):
        if self.started_at and self.ended_at:
            return round((self.ended_at - self.started_at).total_seconds() / 60, 1)
        return None

    def __str__(self):
        return f"[{self.get_type_display()}] {self.appointment} - {self.get_status_display()}"


class ChatMessage(models.Model):
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="messages")
    sender       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    message      = models.TextField()
    attachment   = models.FileField(upload_to="chat_attachments/", blank=True, null=True)
    sent_at      = models.DateTimeField(auto_now_add=True)
    is_read      = models.BooleanField(default=False)

    class Meta:
        db_table            = "chat_messages"
        verbose_name        = "Tin nhắn tư vấn"
        verbose_name_plural = "Tin nhắn tư vấn"
        ordering = ["sent_at"]

    def __str__(self):
        return f"{self.sender} → {self.sent_at:%H:%M %d/%m/%Y}"