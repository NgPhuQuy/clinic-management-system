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


# ─────────────────────────────────────────────────────────────────────────────
# MoMo Integration
# ─────────────────────────────────────────────────────────────────────────────

def _create_momo_payment_url(payment: Payment, request) -> dict:
    """
    Tạo URL thanh toán MoMo.
    Sử dụng MoMo Payment Gateway v2 — captureWallet (ví MoMo).
    Docs: https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method
    """
    partner_code = getattr(settings, "MOMO_PARTNER_CODE", "MOMO_PARTNER_CODE")
    access_key   = getattr(settings, "MOMO_ACCESS_KEY",   "MOMO_ACCESS_KEY")
    secret_key   = getattr(settings, "MOMO_SECRET_KEY",   "MOMO_SECRET_KEY")
    endpoint     = getattr(
        settings, "MOMO_ENDPOINT",
        "https://test-payment.momo.vn/v2/gateway/api/create"
    )

    base_url    = getattr(settings, "BACKEND_BASE_URL", "http://localhost:8000")
    request_id  = str(uuid.uuid4())
    order_id    = f"CLINIC-{payment.id}-{int(time.time())}"
    amount      = int(payment.amount)
    order_info  = f"Thanh toan lich kham #{payment.appointment_id}"
    redirect_url = f"{base_url}/api/payments/momo/return/"
    ipn_url      = f"{base_url}/api/payments/momo/ipn/"
    extra_data   = ""
    request_type = "captureWallet"

    # Tạo chữ ký HMAC-SHA256
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
        # Lưu orderId để đối chiếu khi IPN callback về
        payment.transaction_id = order_id
        payment.save(update_fields=["transaction_id"])
        return {"payment_url": data.get("payUrl", ""), "order_id": order_id}

    return {
        "error": data.get("message", "MoMo error"),
        "result_code": data.get("resultCode"),
    }


def _verify_momo_ipn(data: dict) -> bool:
    """Xác thực chữ ký IPN từ MoMo."""
    secret_key   = getattr(settings, "MOMO_SECRET_KEY",   "MOMO_SECRET_KEY")
    access_key   = getattr(settings, "MOMO_ACCESS_KEY",   "MOMO_ACCESS_KEY")
    partner_code = getattr(settings, "MOMO_PARTNER_CODE", "MOMO_PARTNER_CODE")

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
    tmn_code    = getattr(settings, "VNPAY_TMN_CODE",    "VNPAY_TMN_CODE")
    hash_secret = getattr(settings, "VNPAY_HASH_SECRET", "VNPAY_HASH_SECRET")
    vnpay_url   = getattr(
        settings, "VNPAY_URL",
        "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    )
    base_url     = getattr(settings, "BACKEND_BASE_URL", "http://localhost:8000")
    return_url   = f"{base_url}/api/payments/vnpay/return/"

    txn_ref  = f"CLINIC{payment.id}{int(time.time())}"
    amount   = int(payment.amount) * 100   # VNPay tính bằng đồng * 100
    now_str  = datetime.now().strftime("%Y%m%d%H%M%S")
    ip_addr  = _get_client_ip(request)

    vnp_params = {
        "vnp_Version":   "2.1.0",
        "vnp_Command":   "pay",
        "vnp_TmnCode":   tmn_code,
        "vnp_Amount":    amount,
        "vnp_CreateDate": now_str,
        "vnp_CurrCode":  "VND",
        "vnp_IpAddr":    ip_addr,
        "vnp_Locale":    "vn",
        "vnp_OrderInfo": f"Thanh toan lich kham #{payment.appointment_id}",
        "vnp_OrderType": "other",
        "vnp_ReturnUrl": return_url,
        "vnp_TxnRef":    txn_ref,
    }

    # Sắp xếp tham số theo thứ tự alphabet (bắt buộc để tạo hash đúng)
    sorted_params = sorted(vnp_params.items())

    # Tạo chuỗi hash (không encode giá trị)
    hash_data = "&".join(f"{k}={v}" for k, v in sorted_params)
    signature = hmac.new(
        hash_secret.encode("utf-8"),
        hash_data.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()

    # Tạo query string (encode giá trị cho URL)
    query_string = "&".join(
        f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in sorted_params
    )
    payment_url = f"{vnpay_url}?{query_string}&vnp_SecureHash={signature}"

    # Lưu txn_ref để đối chiếu khi VNPay redirect về
    payment.transaction_id = txn_ref
    payment.save(update_fields=["transaction_id"])

    return {"payment_url": payment_url, "txn_ref": txn_ref}


def _verify_vnpay_return(params: dict) -> bool:
    """Xác thực chữ ký VNPay trả về."""
    hash_secret    = getattr(settings, "VNPAY_HASH_SECRET", "VNPAY_HASH_SECRET")
    received_hash  = params.get("vnp_SecureHash", "")
    # Loại bỏ vnp_SecureHash & vnp_SecureHashType khỏi params trước khi verify
    verify_params  = {k: v for k, v in params.items()
                      if k not in ("vnp_SecureHash", "vnp_SecureHashType")}
    sorted_params  = sorted(verify_params.items())
    hash_data      = "&".join(f"{k}={v}" for k, v in sorted_params)
    expected       = hmac.new(
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
        if "staff"   in scopes: return qs          # thu ngân thấy tất cả
        if "doctor"  in scopes: return qs          # bác sĩ cần biết BN đã trả chưa
        if "patient" in scopes:
            return qs.filter(patient__user=self.request.user)
        return qs.none()

    def get_permissions(self):
        # Các callback từ cổng thanh toán không cần xác thực Bearer
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
        Bệnh nhân khởi tạo thanh toán → trả về payment_url thật.

        Body:
          {
            "appointment_id": 42,
            "payment_method": "momo" | "vnpay" | "cash"
          }
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

        payment, created = Payment.objects.get_or_create(
            appointment=appointment,
            defaults={
                "patient":        request.user.patient_profile,
                "amount":         total,
                "payment_method": serializer.validated_data["payment_method"],
                "status":         Payment.Status.PENDING,
            },
        )

        # Nếu đã thanh toán rồi, không tạo URL mới
        if payment.status == Payment.Status.SUCCESS:
            return Response(
                {"detail": "Lịch hẹn này đã được thanh toán.", "payment_id": payment.id},
                status=status.HTTP_200_OK,
            )

        method = serializer.validated_data["payment_method"]

        # ── Tiền mặt: không cần URL cổng TT ──────────────────────────────
        if method == Payment.Method.CASH:
            return Response({
                "payment_id":     payment.id,
                "amount":         total,
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
                "amount":         total,
                "payment_method": method,
                "payment_url":    result["payment_url"],
                "order_id":       result.get("order_id"),
            })

        # ── VNPay ─────────────────────────────────────────────────────────
        if method in (Payment.Method.VNPAY, Payment.Method.BANKING):
            result = _create_vnpay_payment_url(payment, request)
            return Response({
                "payment_id":     payment.id,
                "amount":         total,
                "payment_method": method,
                "payment_url":    result["payment_url"],
                "txn_ref":        result.get("txn_ref"),
            })

        return Response({"detail": "Phương thức thanh toán không hỗ trợ."}, status=400)

    # ── 2. Xác nhận tiền mặt (staff/admin) ───────────────────────────────

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """
        POST /payments/{id}/confirm/
        Nhân viên thu ngân xác nhận đã nhận tiền (dùng cho tiền mặt hoặc
        bất kỳ phương thức nào cần xác nhận thủ công).

        Body (optional):
          {
            "transaction_id": "CASH-2025-001",
            "notes": "Thu tiền mặt tại quầy"
          }
        """
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

    # ── 3. MoMo IPN callback (server-to-server, AllowAny) ────────────────

    @action(detail=False, methods=["post"], url_path="momo/ipn")
    def momo_ipn(self, request):
        """
        POST /payments/momo/ipn/
        MoMo gọi endpoint này sau khi thanh toán xong.
        Xác thực chữ ký → cập nhật trạng thái payment.
        """
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

        if payment.status != Payment.Status.PENDING:
            return Response({"message": "Already processed"}, status=status.HTTP_200_OK)

        if result_code == 0:
            payment.status         = Payment.Status.SUCCESS
            payment.paid_at        = timezone.now()
            payment.transaction_id = trans_id or order_id
        else:
            payment.status = Payment.Status.FAILED

        payment.save()
        # MoMo yêu cầu response 200 ngay cả khi thất bại
        return Response({"message": "Received", "resultCode": 0}, status=status.HTTP_200_OK)

    # ── 4. MoMo return URL (deep-link về app) ────────────────────────────

    @action(detail=False, methods=["get"], url_path="momo/return")
    def momo_return(self, request):
        """
        GET /payments/momo/return/
        MoMo redirect người dùng về URL này sau khi thanh toán.
        App bắt deep-link và xử lý tiếp; endpoint này chỉ trả HTML đơn giản.
        """
        result_code = request.query_params.get("resultCode")
        order_id    = request.query_params.get("orderId", "")

        success = result_code == "0"
        try:
            payment = Payment.objects.get(transaction_id=order_id)
            if success and payment.status != Payment.Status.SUCCESS:
                payment.status  = Payment.Status.SUCCESS
                payment.paid_at = timezone.now()
                payment.save()
        except Payment.DoesNotExist:
            pass

        # Redirect sang deep-link app hoặc trả JSON (React Native WebView dùng onNavigationStateChange)
        return Response({
            "success": success,
            "message": "Thanh toán thành công" if success else "Thanh toán thất bại",
            "order_id": order_id,
        })

    # ── 5. VNPay return URL ──────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="vnpay/return")
    def vnpay_return(self, request):
        """
        GET /payments/vnpay/return/
        VNPay redirect người dùng về URL này sau khi thanh toán.
        React Native WebView theo dõi URL này để đóng WebView.
        """
        params = request.query_params.dict()

        if not _verify_vnpay_return(params):
            return Response(
                {"success": False, "message": "Chữ ký không hợp lệ"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        txn_ref     = params.get("vnp_TxnRef", "")
        response_code = params.get("vnp_ResponseCode")
        trans_no    = params.get("vnp_TransactionNo", "")
        success     = response_code == "00"

        try:
            payment = Payment.objects.get(transaction_id=txn_ref)
            if payment.status == Payment.Status.PENDING:
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
            "success":    success,
            "message":    "Thanh toán thành công" if success else f"Thanh toán thất bại (mã: {response_code})",
            "txn_ref":    txn_ref,
            "trans_no":   trans_no,
        })
