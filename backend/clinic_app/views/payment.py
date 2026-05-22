import hashlib
import hmac
import json
import time
import uuid
import urllib.parse
from datetime import datetime

import requests as http_client
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..models import Payment, Appointment
from ..serializers import PaymentSerializer, PaymentInitSerializer
from ..permissions import HasPatientScope, HasStaffOrAdminScope, IsAuthenticatedWithValidToken


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_token_scopes(request) -> set:
    token = getattr(request, "auth", None)
    if token is None:
        return set()
    return set(token.scope.split())


def _get_client_ip(request) -> str:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "127.0.0.1")


def _get_setting(name: str, fallback: str) -> str:
    """Lấy setting, trả về fallback nếu None hoặc rỗng."""
    val = getattr(settings, name, None)
    return val if val else fallback


# ─────────────────────────────────────────────────────────────────────────────
# MoMo Integration
# ─────────────────────────────────────────────────────────────────────────────

def _create_momo_payment_url(payment: Payment, request) -> dict:
    """
    Tạo URL thanh toán MoMo (sandbox/production).
    Docs: https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method
    """
    partner_code = _get_setting("MOMO_PARTNER_CODE", "MOMOBKUN20180529")
    access_key   = _get_setting("MOMO_ACCESS_KEY",   "klm05TvNBzhg7h7j")
    secret_key   = _get_setting("MOMO_SECRET_KEY",   "at67qH6mk8w5Y1nAyMoTkqIxteL4MR11")
    endpoint     = _get_setting(
        "MOMO_ENDPOINT",
        "https://test-payment.momo.vn/v2/gateway/api/create"
    )

    base_url     = _get_setting("BACKEND_BASE_URL", "http://localhost:8000")
    request_id   = str(uuid.uuid4())
    order_id     = f"CLINIC-{payment.id}-{int(time.time())}"
    amount       = int(payment.amount)
    order_info   = f"Thanh toan lich kham #{payment.appointment_id}"
    redirect_url = f"{base_url}/api/payments/momo/return/"
    ipn_url      = f"{base_url}/api/payments/momo/ipn/"
    extra_data   = ""
    request_type = "captureWallet"

    raw_sig = (
        f"accessKey={access_key}"
        f"&amount={amount}"
        f"&extraData={extra_data}"
        f"&ipnUrl={ipn_url}"
        f"&orderId={order_id}"
        f"&orderInfo={order_info}"
        f"&partnerCode={partner_code}"
        f"&redirectUrl={redirect_url}"
        f"&requestId={request_id}"
        f"&requestType={request_type}"
    )
    signature = hmac.new(
        secret_key.encode("utf-8"),
        raw_sig.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    payload = {
        "partnerCode": partner_code,
        "accessKey":   access_key,
        "requestId":   request_id,
        "amount":      amount,
        "orderId":     order_id,
        "orderInfo":   order_info,
        "redirectUrl": redirect_url,
        "ipnUrl":      ipn_url,
        "extraData":   extra_data,
        "requestType": request_type,
        "signature":   signature,
        "lang":        "vi",
    }

    try:
        resp = http_client.post(endpoint, json=payload, timeout=10)
        data = resp.json()
    except Exception as exc:
        return {"error": str(exc)}

    if data.get("resultCode") == 0:
        payment.transaction_id = order_id
        payment.save(update_fields=["transaction_id"])
        return {"payment_url": data.get("payUrl", ""), "order_id": order_id}

    return {
        "error": data.get("message", "MoMo error"),
        "result_code": data.get("resultCode"),
    }


def _verify_momo_ipn(data: dict) -> bool:
    """Xác thực chữ ký IPN từ MoMo."""
    secret_key   = _get_setting("MOMO_SECRET_KEY",   "at67qH6mk8w5Y1nAyMoTkqIxteL4MR11")
    access_key   = _get_setting("MOMO_ACCESS_KEY",   "klm05TvNBzhg7h7j")
    partner_code = _get_setting("MOMO_PARTNER_CODE", "MOMOBKUN20180529")

    raw_sig = (
        f"accessKey={access_key}"
        f"&amount={data.get('amount')}"
        f"&extraData={data.get('extraData', '')}"
        f"&message={data.get('message', '')}"
        f"&orderId={data.get('orderId')}"
        f"&orderInfo={data.get('orderInfo', '')}"
        f"&orderType={data.get('orderType', '')}"
        f"&partnerCode={partner_code}"
        f"&payType={data.get('payType', '')}"
        f"&requestId={data.get('requestId')}"
        f"&responseTime={data.get('responseTime', '')}"
        f"&resultCode={data.get('resultCode')}"
        f"&transId={data.get('transId', '')}"
    )
    expected = hmac.new(
        secret_key.encode("utf-8"),
        raw_sig.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, data.get("signature", ""))


# ─────────────────────────────────────────────────────────────────────────────
# VNPay Integration
# ─────────────────────────────────────────────────────────────────────────────

def _create_vnpay_payment_url(payment: Payment, request) -> dict:
    """
    Tạo URL thanh toán VNPay (QR / Internet Banking).
    Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
    """
    tmn_code    = _get_setting("VNPAY_TMN_CODE",    "VNPAYMENT")
    hash_secret = _get_setting("VNPAY_HASH_SECRET", "NWNFRSSJLQOCIJXJXSQBSTUGWHGPYQKM")
    vnpay_url   = _get_setting(
        "VNPAY_URL",
        "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    )
    base_url   = _get_setting("BACKEND_BASE_URL", "http://localhost:8000")
    return_url = f"{base_url}/api/payments/vnpay/return/"

    txn_ref  = f"CLINIC{payment.id}{int(time.time())}"
    amount   = int(payment.amount) * 100   # VNPay tính bằng đồng * 100
    now_str  = datetime.now().strftime("%Y%m%d%H%M%S")
    ip_addr  = _get_client_ip(request)

    vnp_params = {
        "vnp_Version":    "2.1.0",
        "vnp_Command":    "pay",
        "vnp_TmnCode":    tmn_code,
        "vnp_Amount":     amount,
        "vnp_CreateDate": now_str,
        "vnp_CurrCode":   "VND",
        "vnp_IpAddr":     ip_addr,
        "vnp_Locale":     "vn",
        "vnp_OrderInfo":  f"Thanh toan lich kham #{payment.appointment_id}",
        "vnp_OrderType":  "other",
        "vnp_ReturnUrl":  return_url,
        "vnp_TxnRef":     txn_ref,
    }

    # Sắp xếp alphabet → bắt buộc để hash đúng
    sorted_params = sorted(vnp_params.items())
    hash_data = "&".join(f"{k}={v}" for k, v in sorted_params)
    signature = hmac.new(
        hash_secret.encode("utf-8"),
        hash_data.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()

    query_string = "&".join(
        f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in sorted_params
    )
    payment_url = f"{vnpay_url}?{query_string}&vnp_SecureHash={signature}"

    payment.transaction_id = txn_ref
    payment.save(update_fields=["transaction_id"])

    return {"payment_url": payment_url, "txn_ref": txn_ref}


def _verify_vnpay_return(params: dict) -> bool:
    """Xác thực chữ ký VNPay trả về."""
    hash_secret   = _get_setting("VNPAY_HASH_SECRET", "NWNFRSSJLQOCIJXJXSQBSTUGWHGPYQKM")
    received_hash = params.get("vnp_SecureHash", "")
    verify_params = {k: v for k, v in params.items()
                     if k not in ("vnp_SecureHash", "vnp_SecureHashType")}
    sorted_params = sorted(verify_params.items())
    hash_data     = "&".join(f"{k}={v}" for k, v in sorted_params)
    expected      = hmac.new(
        hash_secret.encode("utf-8"),
        hash_data.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, received_hash)


# ─────────────────────────────────────────────────────────────────────────────
# ViewSet
# ─────────────────────────────────────────────────────────────────────────────

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset         = Payment.objects.select_related("patient", "appointment").all()
    serializer_class = PaymentSerializer
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ["status", "payment_method"]

    def get_queryset(self):
        qs     = super().get_queryset()
        scopes = _get_token_scopes(self.request)

        if "admin"   in scopes: return qs
        if "staff"   in scopes: return qs
        if "doctor"  in scopes: return qs
        if "patient" in scopes:
            return qs.filter(patient__user=self.request.user)
        return qs.none()

    def get_permissions(self):
        if self.action in ("momo_ipn", "momo_return", "vnpay_return"):
            return [AllowAny()]
        if self.action == "init":
            return [HasPatientScope()]
        if self.action == "confirm":
            return [HasStaffOrAdminScope()]
        return [IsAuthenticatedWithValidToken()]

    # ── 1. Khởi tạo thanh toán ────────────────────────────────────────────

    @action(detail=False, methods=["post"])
    def init(self, request):
        """
        POST /payments/init/
        Body: { "appointment_id": 42, "payment_method": "momo"|"vnpay"|"cash" }
        """
        serializer = PaymentInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = get_object_or_404(
            Appointment,
            pk=serializer.validated_data["appointment_id"],
            patient__user=request.user,
        )

        # Tính tổng tiền: phí khám + dịch vụ CLS
        total = appointment.doctor.consultation_fee
        for svc in appointment.appointment_services.all():
            total += svc.get_subtotal()

        method = serializer.validated_data["payment_method"]

        payment, created = Payment.objects.get_or_create(
            appointment=appointment,
            defaults={
                "patient":        request.user.patient_profile,
                "amount":         total,
                "payment_method": method,
                "status":         Payment.Status.PENDING,
            },
        )

        # Đã thanh toán thành công → không cho tạo lại
        if payment.status == Payment.Status.SUCCESS:
            return Response(
                {"detail": "Lịch hẹn này đã được thanh toán.", "payment_id": payment.id},
                status=status.HTTP_200_OK,
            )

        # BUG FIX: Nếu thanh toán trước thất bại → reset để thử lại
        if not created and payment.status == Payment.Status.FAILED:
            payment.status         = Payment.Status.PENDING
            payment.payment_method = method
            payment.transaction_id = ""
            payment.save(update_fields=["status", "payment_method", "transaction_id"])

        # BUG FIX: Cập nhật method nếu user đổi phương thức (trạng thái PENDING)
        elif not created and payment.payment_method != method:
            payment.payment_method = method
            payment.save(update_fields=["payment_method"])

        # ── Tiền mặt ─────────────────────────────────────────────────────
        if method == Payment.Method.CASH:
            return Response({
                "payment_id":     payment.id,
                "amount":         str(total),
                "payment_method": method,
                "payment_url":    None,
                "message":        "Vui lòng thanh toán tại quầy thu ngân khi đến khám.",
            })

        # ── MoMo ─────────────────────────────────────────────────────────
        if method == Payment.Method.MOMO:
            result = _create_momo_payment_url(payment, request)
            if "error" in result:
                return Response(
                    {"detail": f"Lỗi kết nối MoMo: {result['error']}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            return Response({
                "payment_id":     payment.id,
                "amount":         str(total),
                "payment_method": method,
                "payment_url":    result["payment_url"],
                "order_id":       result.get("order_id"),
            })

        # ── VNPay ─────────────────────────────────────────────────────────
        if method in (Payment.Method.VNPAY, Payment.Method.BANKING):
            result = _create_vnpay_payment_url(payment, request)
            return Response({
                "payment_id":     payment.id,
                "amount":         str(total),
                "payment_method": method,
                "payment_url":    result["payment_url"],
                "txn_ref":        result.get("txn_ref"),
            })

        return Response({"detail": "Phương thức thanh toán không hỗ trợ."}, status=400)

    # ── 2. Xác nhận tiền mặt (staff/admin) ───────────────────────────────

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """POST /payments/{id}/confirm/ — Thu ngân xác nhận đã nhận tiền."""
        payment = self.get_object()

        if payment.status == Payment.Status.SUCCESS:
            return Response(
                {"detail": "Đã xác nhận thanh toán trước đó rồi."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if payment.status == Payment.Status.REFUNDED:
            return Response(
                {"detail": "Không thể xác nhận thanh toán đã hoàn tiền."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment.status         = Payment.Status.SUCCESS
        payment.paid_at        = timezone.now()
        payment.transaction_id = request.data.get(
            "transaction_id", f"MANUAL-{payment.pk}-{int(time.time())}"
        )
        payment.save()
        return Response(PaymentSerializer(payment).data)

    # ── 3. MoMo IPN callback ─────────────────────────────────────────────

    @action(detail=False, methods=["post"], url_path="momo/ipn")
    def momo_ipn(self, request):
        """POST /payments/momo/ipn/ — MoMo gọi sau khi thanh toán."""
        data = request.data

        if not _verify_momo_ipn(data):
            return Response({"message": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        order_id    = data.get("orderId", "")
        result_code = data.get("resultCode")
        trans_id    = str(data.get("transId", ""))

        try:
            payment = Payment.objects.get(transaction_id=order_id)
        except Payment.DoesNotExist:
            return Response({"message": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        # BUG FIX: chỉ bỏ qua nếu đã SUCCESS, không bỏ qua FAILED (để IPN retry hoạt động)
        if payment.status == Payment.Status.SUCCESS:
            return Response({"message": "Already processed"}, status=status.HTTP_200_OK)

        if result_code == 0:
            payment.status         = Payment.Status.SUCCESS
            payment.paid_at        = timezone.now()
            payment.transaction_id = trans_id or order_id
        else:
            payment.status = Payment.Status.FAILED

        payment.save()
        return Response({"message": "Received", "resultCode": 0}, status=status.HTTP_200_OK)

    # ── 4. MoMo return URL ───────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="momo/return")
    def momo_return(self, request):
        """GET /payments/momo/return/ — MoMo redirect sau khi thanh toán."""
        result_code = request.query_params.get("resultCode")
        order_id    = request.query_params.get("orderId", "")

        success = result_code == "0"
        try:
            payment = Payment.objects.get(transaction_id=order_id)
            # BUG FIX: update dù status là gì (kể cả FAILED từ lần thử trước)
            if success:
                payment.status  = Payment.Status.SUCCESS
                payment.paid_at = timezone.now()
            else:
                payment.status  = Payment.Status.FAILED
            payment.save(update_fields=["status", "paid_at"])
        except Payment.DoesNotExist:
            pass

        return Response({
            "success":  success,
            "message":  "Thanh toán thành công" if success else "Thanh toán thất bại",
            "order_id": order_id,
        })

    # ── 5. VNPay return URL ──────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="vnpay/return")
    def vnpay_return(self, request):
        """GET /payments/vnpay/return/ — VNPay redirect sau khi thanh toán."""
        params = request.query_params.dict()

        if not _verify_vnpay_return(params):
            return Response(
                {"success": False, "message": "Chữ ký không hợp lệ"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        txn_ref       = params.get("vnp_TxnRef", "")
        response_code = params.get("vnp_ResponseCode")
        trans_no      = params.get("vnp_TransactionNo", "")
        success       = response_code == "00"

        try:
            payment = Payment.objects.get(transaction_id=txn_ref)
            # BUG FIX: update dù status là gì
            if success:
                payment.status         = Payment.Status.SUCCESS
                payment.paid_at        = timezone.now()
                payment.transaction_id = trans_no or txn_ref
            else:
                payment.status = Payment.Status.FAILED
            payment.save()
        except Payment.DoesNotExist:
            pass

        return Response({
            "success":  success,
            "message":  "Thanh toán thành công" if success else f"Thanh toán thất bại (mã: {response_code})",
            "txn_ref":  txn_ref,
            "trans_no": trans_no,
        })
