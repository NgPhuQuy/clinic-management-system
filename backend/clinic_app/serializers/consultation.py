from django.conf import settings
from rest_framework import serializers
from ..models import Consultation, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ("id", "consultation", "sender", "sender_name", "message", "attachment", "sent_at", "is_read")
        read_only_fields = ("id", "sender", "sent_at")

    def get_sender_name(self, obj):
        user = obj.sender
        full = f"{user.first_name} {user.last_name}".strip()
        return full or user.username


class ConsultationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    agora_app_id = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = (
            "id", "appointment", "type", "room_url", "room_id",
            "status", "started_at", "ended_at", "duration_minutes",
            "agora_app_id", "messages",
        )
        read_only_fields = ("id", "room_url", "room_id")

    def get_duration_minutes(self, obj):
        return obj.get_duration_minutes()

    def get_agora_app_id(self, obj):
        return getattr(settings, "AGORA_APP_ID", "")
