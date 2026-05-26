from datetime import timedelta
from django.db.models import Count, Sum, Q, F
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, ExtractYear
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import (
    Patient, Appointment, Payment,
    MedicalRecord, AppointmentService, InventoryAlert,
)
from ..permissions import HasAdminScope


class DashboardView(APIView):
    permission_classes = [HasAdminScope]

    def get(self, request):
        today      = timezone.now().date()
        this_month = timezone.now().replace(day=1).date()

        total_patients     = Patient.objects.count()
        new_patients_month = Patient.objects.filter(
            user__date_joined__date__gte=this_month
        ).count()

        appointments_today  = Appointment.objects.filter(appointment_date__date=today).count()
        appointments_month  = Appointment.objects.filter(appointment_date__date__gte=this_month).count()
        appointments_status = dict(
            Appointment.objects
            .values("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        revenue_today = Payment.objects.filter(
            status="success", paid_at__date=today
        ).aggregate(total=Sum("amount"))["total"] or 0

        revenue_month = Payment.objects.filter(
            status="success", paid_at__date__gte=this_month
        ).aggregate(total=Sum("amount"))["total"] or 0

        top_diagnoses = list(
            MedicalRecord.objects
            .values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        top_services = list(
            AppointmentService.objects
            .values("service__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        pending_alerts = InventoryAlert.objects.filter(is_resolved=False).count()

        return Response({
            "patients": {
                "total":          total_patients,
                "new_this_month": new_patients_month,
            },
            "appointments": {
                "today":      appointments_today,
                "this_month": appointments_month,
                "by_status":  appointments_status,
            },
            "revenue": {
                "today":      revenue_today,
                "this_month": revenue_month,
            },
            "top_diagnoses":   top_diagnoses,
            "top_services":    top_services,
            "inventory_alerts": pending_alerts,
        })


class DashboardReportsView(APIView):
    permission_classes = [HasAdminScope]

    def get(self, request):
        report_type = request.query_params.get("type", "age_group")
        period      = request.query_params.get("period", "month")
        days        = int(request.query_params.get("days", 30))
        since       = timezone.now().date() - timedelta(days=days)

        handler = {
            "age_group": self._report_age_group,
            "gender":    self._report_gender,
            "specialty": self._report_specialty,
            "disease":   self._report_disease,
            "service":   self._report_service,
            "revenue":   self._report_revenue,
        }.get(report_type)

        if handler is None:
            return Response(
                {"detail": f"Loại báo cáo '{report_type}' không hợp lệ. "
                           f"Chọn: age_group, gender, specialty, disease, service, revenue."},
                status=400,
            )

        data = handler(since=since, period=period)
        return Response({"type": report_type, "period": period, "days": days, "data": data})

    def _report_age_group(self, since, **kwargs):
        from django.db.models import Case, When, IntegerField
        current_year = timezone.now().year

        patients = Patient.objects.annotate(
            age=current_year - ExtractYear("date_of_birth")
        ).values("age")

        buckets = {"<18": 0, "18-30": 0, "31-45": 0, "46-60": 0, ">60": 0}
        for p in patients:
            age = p.get("age")
            if age is None:
                continue
            if age < 18:
                buckets["<18"] += 1
            elif age <= 30:
                buckets["18-30"] += 1
            elif age <= 45:
                buckets["31-45"] += 1
            elif age <= 60:
                buckets["46-60"] += 1
            else:
                buckets[">60"] += 1

        return [{"age_group": k, "count": v} for k, v in buckets.items()]

    # ── 2. Bệnh nhân theo giới tính ────────────────────────────────────────

    def _report_gender(self, since, **kwargs):
        """Phân bố giới tính bệnh nhân."""
        data = (
            Patient.objects
            .values("gender")
            .annotate(count=Count("id"))
            .order_by("gender")
        )
        return list(data)

    # ── 3. Lượt khám theo chuyên khoa ──────────────────────────────────────

    def _report_specialty(self, since, **kwargs):
        data = (
            Appointment.objects
            .filter(
                appointment_date__date__gte=since,
                status__in=["completed", "in_progress"],
            )
            .values("doctor__specialty__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        return [
            {"specialty": item["doctor__specialty__name"], "count": item["count"]}
            for item in data
        ]

    # ── 4. Bệnh phổ biến trong cộng đồng ──────────────────────────────────

    def _report_disease(self, since, **kwargs):
        data = (
            MedicalRecord.objects
            .filter(created_at__date__gte=since)
            .values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")[:20]
        )
        return list(data)

    # ── 5. Dịch vụ y tế được sử dụng ──────────────────────────────────────

    def _report_service(self, since, **kwargs):
        """
        Số lượng dịch vụ y tế được sử dụng.
        Đề tài: "báo cáo số lượng dịch vụ y tế được sử dụng"
        """
        data = (
            AppointmentService.objects
            .filter(appointment__appointment_date__date__gte=since)
            .values("service__name", "service__specialty__name")
            .annotate(
                count=Count("id"),
                revenue=Sum(F("quantity") * F("price_at_time")),
            )
            .order_by("-count")
        )
        return [
            {
                "service":   item["service__name"],
                "specialty": item["service__specialty__name"],
                "count":     item["count"],
                "revenue":   item["revenue"],
            }
            for item in data
        ]

    # ── 6. Doanh thu chi tiết theo thời gian ───────────────────────────────

    def _report_revenue(self, since, period="month", **kwargs):
        trunc_fn = {
            "day":   TruncDay,
            "week":  TruncWeek,
            "month": TruncMonth,
        }.get(period, TruncMonth)

        timeline = (
            Payment.objects
            .filter(status="success", paid_at__date__gte=since)
            .annotate(period=trunc_fn("paid_at"))
            .values("period")
            .annotate(
                total=Sum("amount"),
                count=Count("id"),
            )
            .order_by("period")
        )

        by_method = (
            Payment.objects
            .filter(status="success", paid_at__date__gte=since)
            .values("payment_method")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        total_revenue = (
            Payment.objects
            .filter(status="success", paid_at__date__gte=since)
            .aggregate(total=Sum("amount"))["total"] or 0
        )

        return {
            "total":     total_revenue,
            "timeline":  [
                {
                    "period": item["period"].strftime("%Y-%m-%d") if item["period"] else None,
                    "total":  item["total"],
                    "count":  item["count"],
                }
                for item in timeline
            ],
            "by_method": list(by_method),
        }