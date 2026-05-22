import {
    View, StyleSheet, ActivityIndicator,
    TouchableOpacity, Alert, Platform
} from "react-native";
import { Text } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useRef, useState, useCallback } from "react";
import { WebView } from "react-native-webview";
import { COLORS } from "../../styles/Styles";

const MOMO_RETURN_PATH  = "/api/payments/momo/return/";
const VNPAY_RETURN_PATH = "/api/payments/vnpay/return/";

const parseQuery = (search = "") => {
    const q = search.startsWith("?") ? search.slice(1) : search;
    if (!q) return {};
    return Object.fromEntries(
        q.split("&").map(p => {
            const [k, ...v] = p.split("=");
            return [decodeURIComponent(k), decodeURIComponent(v.join("="))];
        })
    );
};

const PaymentWebView = () => {
    const nav   = useNavigation();
    const route = useRoute();
    const { paymentUrl, paymentId, method } = route.params;

    const webViewRef = useRef(null);
    const [loadingPage, setLoadingPage] = useState(true);
    // BUG FIX: dùng ref thay vì state để tránh re-render và race condition
    const handled = useRef(false);

    const handleReturnUrl = useCallback((url) => {
        if (handled.current) return false;

        let urlObj;
        try { urlObj = new URL(url); } catch { return false; }

        const path = urlObj.pathname;
        const isMoMoReturn  = path.includes("momo/return");
        const isVNPayReturn = path.includes("vnpay/return");

        if (!isMoMoReturn && !isVNPayReturn) return false;

        handled.current = true;

        const params  = parseQuery(urlObj.search);
        let success   = false;
        let errorCode = "?";

        if (isMoMoReturn) {
            success   = params.resultCode === "0";
            errorCode = params.resultCode ?? "?";
        } else {
            success   = params.vnp_ResponseCode === "00";
            errorCode = params.vnp_ResponseCode ?? "?";
        }

        // BUG FIX: dùng replace để xóa WebView khỏi history
        nav.replace("payment-result", {
            success,
            paymentId,
            method,
            message: success
                ? "Thanh toán thành công!"
                : `Thanh toán thất bại (mã: ${errorCode})`,
        });

        return true;
    }, [nav, paymentId, method]);

    // iOS: intercept trước khi load
    const onShouldStartLoadWithRequest = useCallback((request) => {
        const blocked = handleReturnUrl(request.url);
        return !blocked;
    }, [handleReturnUrl]);

    // Android + iOS fallback: theo dõi navigation state
    const onNavigationStateChange = useCallback((navState) => {
        handleReturnUrl(navState.url);
    }, [handleReturnUrl]);

    // BUG FIX: thêm onLoadStart để bắt redirect trên một số Android WebView
    const onLoadStart = useCallback(({ nativeEvent }) => {
        setLoadingPage(true);
        handleReturnUrl(nativeEvent.url);
    }, [handleReturnUrl]);

    const onLoadEnd = useCallback(() => setLoadingPage(false), []);

    const handleClose = () =>
        Alert.alert(
            "Hủy thanh toán?",
            "Giao dịch chưa hoàn tất. Bạn có muốn quay lại không?",
            [
                { text: "Tiếp tục thanh toán", style: "cancel" },
                {
                    text: "Hủy giao dịch",
                    style: "destructive",
                    onPress: () => nav.goBack(),
                },
            ]
        );

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                    <Text style={styles.closeText}>✕  Đóng</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {method === "momo" ? "🟣 Thanh toán MoMo" : "🔵 Thanh toán VNPay"}
                </Text>
            </View>

            {loadingPage && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Đang kết nối cổng thanh toán…</Text>
                </View>
            )}

            <WebView
                ref={webViewRef}
                source={{ uri: paymentUrl }}
                onLoadStart={onLoadStart}
                onLoadEnd={onLoadEnd}
                onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                onNavigationStateChange={onNavigationStateChange}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                style={{ flex: 1 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: Platform.OS === "ios" ? 52 : 36,
        paddingBottom: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    closeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
    closeText: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },
    headerTitle: { color: "#fff", fontSize: 15, fontWeight: "800", flex: 1 },
    loadingOverlay: {
        position: "absolute",
        top: Platform.OS === "ios" ? 110 : 90,
        left: 0, right: 0, bottom: 0,
        zIndex: 10,
        backgroundColor: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
    },
    loadingText: { color: COLORS.textMuted, fontSize: 13 },
});

export default PaymentWebView;
