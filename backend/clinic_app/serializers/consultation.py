from rest_framework import serializers
from ..models import Consultation, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ("id", "consultation", "sender", "sender_name", "message", "attachment", "sent_at", "is_read")
        read_only_fields = ("id", "sender", "sent_at")


class ConsultationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = (
            "id", "appointment", "type", "room_url", "room_id",
            "status", "started_at", "ended_at", "duration_minutes", "messages",
        )
        read_only_fields = ("id", "room_url", "room_id")

    def get_duration_minutes(self, obj):
        return obj.get_duration_minutes()
