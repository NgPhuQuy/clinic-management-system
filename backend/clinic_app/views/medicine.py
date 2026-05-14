from contextlib import nullcontext
from datetime import timedelta

from django.db.models import F
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import MedicineCategory, Medicine, Inventory, InventoryAlert
from ..serializers import (
    MedicineCategorySerializer, MedicineSerializer,
    InventorySerializer, InventoryAlertSerializer,
)
from ..permissions import HasAdminScope


class MedicineCategoryViewSet(viewsets.ModelViewSet):
    queryset = MedicineCategory.objects.all()
    serializer_class = MedicineCategorySerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [HasAdminScope()]
        return [IsAuthenticated()]


class MedicineViewSet(viewsets.ModelViewSet):
    """
    GET  /api/medicines/         — Danh sách thuốc
    GET  /api/medicines/{id}/    — Chi tiết + tổng tồn kho
    """
    queryset = Medicine.objects.select_related("category").filter(is_active=True)
    serializer_class = MedicineSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "requires_prescription"]
    search_fields = ["name", "code", "generic_name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [HasAdminScope()]
        return [IsAuthenticated()]


class InventoryViewSet(viewsets.ModelViewSet):
    """
    GET  /api/inventory/         — Xem tồn kho
    POST /api/inventory/         — Nhập kho (admin/staff)
    """
    queryset = Inventory.objects.select_related("medicine").all()
    serializer_class = InventorySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["medicine"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return nullcontext #[IsStaff()]
        return [IsAuthenticated()]

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        """GET /api/inventory/low_stock/ — Danh sách thuốc sắp hết."""
        qs = self.get_queryset().filter(quantity__lte=F("warning_threshold"))
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def near_expiry(self, request):
        """GET /api/inventory/near_expiry/ — Thuốc sắp hết hạn (30 ngày)."""
        threshold = timezone.now().date() + timedelta(days=30)
        qs = self.get_queryset().filter(
            expiry_date__lte=threshold,
            expiry_date__gt=timezone.now().date(),
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class InventoryAlertViewSet(viewsets.ModelViewSet):
    """GET /api/inventory-alerts/ — Danh sách cảnh báo kho thuốc."""
    queryset = InventoryAlert.objects.select_related("medicine").order_by("-created_at")
    serializer_class = InventoryAlertSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["alert_type", "is_resolved"]

    def get_permissions(self):
        return [HasAdminScope()]

    @action(detail=True, methods=["patch"])
    def resolve(self, request, pk=None):
        """PATCH /api/inventory-alerts/{id}/resolve/ — Đánh dấu đã xử lý."""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        return Response({"detail": "Đã đánh dấu xử lý."})
