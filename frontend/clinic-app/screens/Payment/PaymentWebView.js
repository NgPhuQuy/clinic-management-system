import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useRef, useState } from "react";
import { WebView } from "react-native-webview";
import { COLORS } from "../../styles/Styles";

// Base URL của backend — phải khớp với EXPO_PUBLIC_BASE_URL
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

// URL mà backend redirect về sau khi MoMo/VNPay xong
const MOMO_RETURN_PATH   = "/api/payments/momo/return/";
const VNPAY_RETURN_PATH  = "/api/payments/vnpay/return/";

/**
 * Parse query string thành object.
 * "?foo=1&bar=2" → { foo: "1", bar: "2" }
 */
const parseQuery = (search = "") => {
    const q = search.startsWith("?") ? search.slice(1) : search;
    return Object.fromEntries(q.split("&").map(p => p.split("=").map(decodeURIComponent)));
};

const PaymentWebView = () => {
    const nav = useNavigation();
    const route = useRoute();
    const { paymentUrl, paymentId, method } = route.params;

    const webViewRef = useRef(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const handled = useRef(false); // tránh xử lý hai lần

    const handleReturn = (url) => {
        if (handled.current) return false;

        const urlObj = (() => {
            try { return new URL(url); } catch { return null; }
        })();
        if (!urlObj) return false;

        const path = urlObj.pathname;

        if (!path.includes("momo/return") && !path.includes("vnpay/return")) return false;

        handled.current = true;

        const params = parseQuery(urlObj.search);
        let success = false;

        if (path.includes("momo/return")) {
            success = params.resultCode === "0";
        } else {
            success = params.vnp_ResponseCode === "00";
        }

        // Chuyển về PaymentResult, xóa WebView khỏi stack
        nav.replace("payment-result", {
            success,
            paymentId,
            method,
            message: success
                ? "Thanh toán thành công!"
                : `Thanh toán thất bại (${params.resultCode ?? params.vnp_ResponseCode ?? "?"})`,
        });

        return true; // block WebView khỏi tiếp tục load URL return
    };

    // Gọi khi WebView chuẩn bị load một URL mới
    const onShouldStartLoadWithRequest = (request) => {
        const blocked = handleReturn(request.url);
        return !blocked; // true = cho phép load, false = chặn
    };

    // Fallback: theo dõi khi navigation state thay đổi
    const onNavigationStateChange = (navState) => {
        handleReturn(navState.url);
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Header tối giản */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() =>
                        Alert.alert(
                            "Hủy thanh toán?",
                            "Bạn có muốn hủy và quay lại không?",
                            [
                                { text: "Tiếp tục thanh toán", style: "cancel" },
                                { text: "Hủy", style: "destructive", onPress: () => nav.goBack() },
                            ]
                        )
                    }
                >
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
                onLoadStart={() => setLoadingPage(true)}
                onLoadEnd={() => setLoadingPage(false)}
                onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                onNavigationStateChange={onNavigationStateChange}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
                style={{ flex: 1 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 48,
        paddingBottom: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    closeBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    closeText: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 13,
        fontWeight: "600",
    },
    headerTitle: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "800",
        flex: 1,
    },
    loadingOverlay: {
        position: "absolute",
        top: 110,
        left: 0, right: 0, bottom: 0,
        zIndex: 10,
        backgroundColor: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
    },
    loadingText: {
        color: COLORS.textMuted,
        fontSize: 13,
    },
});

export default PaymentWebView;