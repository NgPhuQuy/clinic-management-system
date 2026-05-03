from rest_framework import viewsets, filters
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from ..models import Specialty, Service
from ..serializers import SpecialtySerializer, ServiceSerializer
from ..permissions import IsAdmin
class SpecialtyViewSet(viewsets.ModelViewSet):
    """
    GET    /api/specialties/         — Danh sách chuyên khoa
    POST   /api/specialties/         — Tạo mới (admin)
    GET    /api/specialties/{id}/    — Chi tiết
    PUT    /api/specialties/{id}/    — Cập nhật (admin)
    DELETE /api/specialties/{id}/    — Xóa (admin)
    """
    queryset = Specialty.objects.filter(is_active=True)
    serializer_class = SpecialtySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]
    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [AllowAny()]
class ServiceViewSet(viewsets.ModelViewSet):
    """GET /api/services/ — Danh sách dịch vụ, lọc theo chuyên khoa."""
    queryset = Service.objects.filter(is_active=True).select_related("specialty")
    serializer_class = ServiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["specialty"]
    search_fields = ["name"]
    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [AllowAny()]