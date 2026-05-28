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


def _medicine_qs_with_stock():
    today = timezone.now().date()
    return (
        Medicine.objects
        .select_related("category")
        .filter(is_active=True)
        .annotate(
            _total_stock_annotated=Sum(
                "inventory_batches__quantity",
                filter=Q(
                    inventory_batches__expiry_date__gt=today,
                    inventory_batches__is_disposed=False,
                ),
            )
        )
    )


class MedicineCategoryViewSet(viewsets.ModelViewSet):
    queryset         = MedicineCategory.objects.all()
    serializer_class = MedicineCategorySerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [HasAdminScope()]
        return [IsAuthenticatedWithValidToken()]


class MedicineViewSet(viewsets.ModelViewSet):
    serializer_class = MedicineSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "requires_prescription"]
    search_fields    = ["name", "code", "generic_name"]

    def get_queryset(self):
        return _medicine_qs_with_stock()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [HasAdminScope()]
        return [IsAuthenticatedWithValidToken()]


class InventoryViewSet(viewsets.ModelViewSet):
    serializer_class = InventorySerializer
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ["medicine"]

    def get_queryset(self):
        return Inventory.objects.select_related("medicine").filter(is_disposed=False)

    def get_permissions(self):
        if self.action == "destroy":
            return [HasAdminScope()]
        if self.action in ("create", "update", "partial_update", "dispose"):
            return [HasStaffOrAdminScope()]
        return [IsAuthenticatedWithValidToken()]

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        qs = _medicine_qs_with_stock().filter(
            Q(_total_stock_annotated__lte=F("warning_threshold"))
            | Q(_total_stock_annotated__isnull=True)
        )
        return Response(MedicineSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def near_expiry(self, request):
        threshold = timezone.now().date() + timedelta(days=settings.INVENTORY_NEAR_EXPIRY_DAYS)
        qs = Inventory.objects.select_related("medicine").filter(
            expiry_date__lte=threshold,
            expiry_date__gt=timezone.now().date(),
            is_disposed=False,
        )
        return Response(InventorySerializer(qs, many=True).data)

    @action(detail=True, methods=["patch"])
    def dispose(self, request, pk=None):
        batch = self.get_object()
        batch.is_disposed = True
        batch.disposed_at = timezone.now()
        batch.save(update_fields=["is_disposed", "disposed_at"])
        return Response({"detail": "Đã xuất hủy lô thuốc."})


class InventoryAlertViewSet(viewsets.ModelViewSet):
    queryset         = InventoryAlert.objects.select_related("medicine").order_by("-created_at")
    serializer_class = InventoryAlertSerializer
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ["alert_type", "is_resolved"]

    def get_permissions(self):
        return [HasStaffOrAdminScope()]

    @action(detail=True, methods=["patch"])
    def resolve(self, request, pk=None):
        alert             = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        return Response({"detail": "Đã đánh dấu xử lý."})
