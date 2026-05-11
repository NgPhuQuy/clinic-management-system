from rest_framework import serializers
from ..models import Specialty, Service


class SpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)

    class Meta:
        model = Service
        fields = ("id", "specialty", "specialty_name", "name", "description", "price", "is_active")
