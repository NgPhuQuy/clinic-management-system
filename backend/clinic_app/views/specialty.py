from rest_framework import viewsets, filters
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Specialty, Service
from ..serializers import SpecialtySerializer, ServiceSerializer
from ..permissions import HasAdminScope


class SpecialtyViewSet(viewsets.ModelViewSet):
    queryset = Specialty.objects.filter(is_active=True)
    serializer_class = SpecialtySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [HasAdminScope()]
        return [AllowAny()]


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.filter(is_active=True).select_related("specialty")
    serializer_class = ServiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["specialty"]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [HasAdminScope()]
        return [AllowAny()]
