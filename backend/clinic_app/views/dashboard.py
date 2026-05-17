from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from ..models import Patient, Appointment, Payment, MedicalRecord, AppointmentService, InventoryAlert
from ..permissions import HasAdminScope


class DashboardView(APIView):
    """
    GET /api/admin/dashboard/
    Báo cáo tổng hợp cho admin.
    """
    permission_classes = [HasAdminScope]

    def get(self, request):
        today = timezone.now().date()
        this_month = timezone.now().replace(day=1).date()

        total_patients = Patient.objects.count()
        new_patients_month = Patient.objects.filter(user__date_joined__date__gte=this_month).count()

        appointments_today = Appointment.objects.filter(appointment_date__date=today).count()
        appointments_month = Appointment.objects.filter(appointment_date__date__gte=this_month).count()
        appointments_by_status = dict(
            Appointment.objects.values("status").annotate(count=Count("id")).values_list("status", "count")
        )

        revenue_month = Payment.objects.filter(
            status="success", paid_at__date__gte=this_month
        ).aggregate(total=Sum("amount"))["total"] or 0

        revenue_today = Payment.objects.filter(
            status="success", paid_at__date=today
        ).aggregate(total=Sum("amount"))["total"] or 0

        top_diagnoses = (
            MedicalRecord.objects
            .values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        top_services = (
            AppointmentService.objects
            .values("service__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        pending_alerts = InventoryAlert.objects.filter(is_resolved=False).count()

        return Response({
            "patients": {
                "total": total_patients,
                "new_this_month": new_patients_month,
            },
            "appointments": {
                "today": appointments_today,
                "this_month": appointments_month,
                "by_status": appointments_by_status,
            },
            "revenue": {
                "today": revenue_today,
                "this_month": revenue_month,
            },
            "top_diagnoses": list(top_diagnoses),
            "top_services": list(top_services),
            "inventory_alerts": pending_alerts,
        })
