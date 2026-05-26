"""
clinic_app/views/medicine.py

Endpoints:
  GET    /api/medicine-categories/              — Danh sách danh mục  [any auth]
  POST   /api/medicine-categories/              — Tạo danh mục        [admin]
  GET    /api/medicines/                        — Danh sách thuốc     [any auth]
  POST   /api/medicines/                        — Tạo thuốc           [admin]
  GET    /api/inventory/                        — Xem tồn kho         [any auth]
  POST   /api/inventory/                        — Nhập kho            [staff|admin] 
  PUT    /api/inventory/{id}/                   — Cập nhật lô         [staff|admin]  
  GET    /api/inventory/low_stock/              — Thuốc sắp hết       [staff|admin]
  GET    /api/inventory/near_expiry/            — Thuốc sắp hết hạn   [staff|admin]
  GET    /api/inventory-alerts/                 — Danh sách cảnh báo  [staff|admin]
  PATCH  /api/inventory-alerts/{id}/resolve/    — Đánh dấu đã xử lý  [staff|admin]
"""
from datetime import timedelta
from django.conf import settings
from django.db.models import F, Q, Sum
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import MedicineCategory, Medicine, Inventory, InventoryAlert
from ..serializers import (
    MedicineCategorySerializer, MedicineSerializer,
    InventorySerializer, InventoryAlertSerializer,
)
from ..permissions import HasAdminScope, HasStaffOrAdminScope, IsAuthenticatedWithValidToken


class MedicineCategoryViewSet(viewsets.ModelViewSet):
    """Danh mục thuốc — chỉ admin tạo/sửa/xóa."""
    queryset         = MedicineCategory.objects.all()
    serializer_class = MedicineCategorySerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [HasAdminScope()]
        return [IsAuthenticatedWithValidToken()]


class MedicineViewSet(viewsets.ModelViewSet):
    """Danh sách thuốc — chỉ admin tạo/sửa/xóa."""
    serializer_class = MedicineSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "requires_prescription"]
    search_fields    = ["name", "code", "generic_name"]

    def get_queryset(self):
        today = timezone.now().date()
        return Medicine.objects.select_related("category").filter(is_active=True).annotate(
            total_stock=Sum(
                "inventory_batches__quantity",
                filter=Q(inventory_batches__expiry_date__gt=today),
            )
        )

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [HasAdminScope()]
        return [IsAuthenticatedWithValidToken()]


class InventoryViewSet(viewsets.ModelViewSet):
    """
    Tồn kho thuốc.
    """
    queryset         = Inventory.objects.select_related("medicine").all()
    serializer_class = InventorySerializer
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ["medicine"]

    def get_permissions(self):
        if self.action == "destroy":
            # Chỉ admin xóa lô thuốc
            return [HasAdminScope()]
        if self.action in ("create", "update", "partial_update"):
            # Staff dược sĩ nhập kho / cập nhật lô
            return [HasStaffOrAdminScope()]
        return [IsAuthenticatedWithValidToken()]

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        """GET /api/inventory/low_stock/"""
        qs = self.get_queryset().filter(quantity__lte=F("warning_threshold"))
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def near_expiry(self, request):
        """GET /api/inventory/near_expiry/ — Thuốc hết hạn trong 30 ngày."""
        threshold = timezone.now().date() + timedelta(days=settings.INVENTORY_NEAR_EXPIRY_DAYS)
        qs = self.get_queryset().filter(
            expiry_date__lte=threshold,
            expiry_date__gt=timezone.now().date(),
        )
        return Response(self.get_serializer(qs, many=True).data)


class InventoryAlertViewSet(viewsets.ModelViewSet):
    """
    Cảnh báo kho thuốc.
    Staff cũng cần xem và resolve alerts (dược sĩ xử lý thuốc hết hạn, nhập thêm kho).
    """
    queryset         = InventoryAlert.objects.select_related("medicine").order_by("-created_at")
    serializer_class = InventoryAlertSerializer
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ["alert_type", "is_resolved"]

    def get_permissions(self):
        return [HasStaffOrAdminScope()]

    @action(detail=True, methods=["patch"])
    def resolve(self, request, pk=None):
        """PATCH /api/inventory-alerts/{id}/resolve/"""
        alert             = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        return Response({"detail": "Đã đánh dấu xử lý."})