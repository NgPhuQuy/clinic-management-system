from rest_framework import serializers
from ..models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "title", "message", "type", "is_read", "related_object_id", "created_at", "read_at")
        read_only_fields = ("id", "created_at")
