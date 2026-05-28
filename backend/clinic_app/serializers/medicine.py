from django.conf import settings
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
    total_stock   = serializers.SerializerMethodField()
    is_low_stock  = serializers.SerializerMethodField()

    class Meta:
        model = Medicine
        fields = (
            "id", "category", "category_name", "name", "code",
            "generic_name", "unit", "price", "requires_prescription",
            "description", "is_active", "warning_threshold",
            "total_stock", "is_low_stock",
        )

    def get_total_stock(self, obj):
        if hasattr(obj, "_total_stock_annotated"):
            return obj._total_stock_annotated or 0
        return (
            obj.inventory_batches
            .filter(expiry_date__gt=timezone.now().date(), is_disposed=False)
            .aggregate(total=Sum("quantity"))["total"]
            or 0
        )

    def get_is_low_stock(self, obj):
        return self.get_total_stock(obj) <= obj.warning_threshold


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
            "is_disposed", "disposed_at",
        )
        read_only_fields = ("is_disposed", "disposed_at")

    def get_is_near_expiry(self, obj):
        return obj.is_near_expiry(days=settings.INVENTORY_NEAR_EXPIRY_DAYS)


class InventoryAlertSerializer(serializers.ModelSerializer):
    medicine_name  = serializers.CharField(source="medicine.name",  read_only=True)
    medicine_unit  = serializers.CharField(source="medicine.unit",  read_only=True)
    batch_number   = serializers.CharField(source="inventory.batch_number", read_only=True)
    expiry_date    = serializers.DateField(source="inventory.expiry_date",  read_only=True)
    batch_quantity = serializers.IntegerField(source="inventory.quantity",  read_only=True)

    class Meta:
        model = InventoryAlert
        fields = (
            "id", "medicine", "medicine_name", "medicine_unit",
            "inventory", "batch_number", "expiry_date", "batch_quantity",
            "alert_type", "message", "is_resolved", "created_at", "resolved_at",
        )
        read_only_fields = ("id", "created_at")
