from datetime import date, timedelta
from django.db import models


class MedicineCategory(models.Model):
    name        = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table            = "medicine_categories"
        verbose_name        = "Danh mục thuốc"
        verbose_name_plural = "Danh mục thuốc" 
        ordering = ["name"]

    def __str__(self):
        return self.name


class Medicine(models.Model):
    category              = models.ForeignKey(MedicineCategory, on_delete=models.SET_NULL, null=True, related_name="medicines")
    name                  = models.CharField(max_length=255)
    code                  = models.CharField(max_length=50, unique=True)
    generic_name          = models.CharField(max_length=255, blank=True, help_text="Tên hoạt chất")
    unit                  = models.CharField(max_length=50, help_text="Đơn vị: viên, ml, gói...")
    price                 = models.DecimalField(max_digits=12, decimal_places=2)
    requires_prescription = models.BooleanField(default=False, help_text="Cần kê đơn")
    description           = models.TextField(blank=True)
    is_active             = models.BooleanField(default=True)

    class Meta:
        db_table            = "medicines"
        verbose_name        = "Thuốc"
        verbose_name_plural = "Thuốc"
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Inventory(models.Model):
    medicine          = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="inventory_batches")
    batch_number      = models.CharField(max_length=100)
    quantity          = models.PositiveIntegerField(default=0, help_text="Số lượng tồn kho")
    expiry_date       = models.DateField()
    import_date       = models.DateField(default=date.today)
    import_price      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    supplier          = models.CharField(max_length=255, blank=True)
    warning_threshold = models.PositiveIntegerField(default=10, help_text="Ngưỡng cảnh báo số lượng thấp")

    class Meta:
        db_table            = "inventory"
        verbose_name        = "Tồn kho thuốc"
        verbose_name_plural = "Tồn kho thuốc"
        unique_together = ("medicine", "batch_number")

    def is_low_stock(self):
        return self.quantity <= self.warning_threshold

    def is_near_expiry(self, days=30):
        return self.expiry_date <= date.today() + timedelta(days=days)

    def __str__(self):
        return f"{self.medicine.name} | Lô: {self.batch_number} | SL: {self.quantity}"


class InventoryAlert(models.Model):
    class AlertType(models.TextChoices):
        LOW_STOCK   = "low_stock",   "Sắp hết hàng"
        NEAR_EXPIRY = "near_expiry", "Sắp hết hạn"
        EXPIRED     = "expired",     "Đã hết hạn"

    medicine    = models.ForeignKey(Medicine,  on_delete=models.CASCADE, related_name="alerts")
    inventory   = models.ForeignKey(Inventory, on_delete=models.CASCADE, null=True, blank=True, related_name="alerts")
    alert_type  = models.CharField(max_length=20, choices=AlertType)
    message     = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table            = "inventory_alerts"
        verbose_name        = "Cảnh báo kho thuốc"
        verbose_name_plural = "Cảnh báo kho thuốc"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_alert_type_display()}] {self.medicine.name}"