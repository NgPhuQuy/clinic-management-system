from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers
from ..models import MedicineCategory, Medicine, Inventory, InventoryAlert


class MedicineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineCategory
        fields = "__all__"


class MedicineSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Medicine
        fields = (
            "id", "category", "category_name", "name", "code",
            "generic_name", "unit", "price", "requires_prescription",
            "description", "is_active", "total_stock",
        )

    def get_total_stock(self, obj):
        return (
            obj.inventory_batches
            .filter(expiry_date__gt=timezone.now().date())
            .aggregate(total=Sum("quantity"))["total"]
            or 0
        )


class InventorySerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_near_expiry = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = (
            "id", "medicine", "medicine_name", "batch_number",
            "quantity", "expiry_date", "import_date", "import_price",
            "supplier", "warning_threshold", "is_low_stock", "is_near_expiry",
        )

    def get_is_near_expiry(self, obj):
        return obj.is_near_expiry(days=30)


class InventoryAlertSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)

    class Meta:
        model = InventoryAlert
        fields = (
            "id", "medicine", "medicine_name", "inventory",
            "alert_type", "message", "is_resolved", "created_at", "resolved_at",
        )
        read_only_fields = ("id", "created_at")
