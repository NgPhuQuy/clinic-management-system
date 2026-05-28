import {
    View, ActivityIndicator,
    TouchableOpacity, Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useRef, useState, useCallback, useContext } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { COLORS, paymentWebViewStyles as S } from "../../styles/Styles";
import apis, { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";

const parseQuery = (search = "") => {
    try {
        return Object.fromEntries(new URLSearchParams(search).entries());
    } catch {
        return {};
    }
};

const PaymentWebView = () => {
    const nav   = useNavigation();
    const route = useRoute();
    const user  = useContext(MyUserContext);
    const { paymentUrl, paymentId, method, fromBooking = false } = route.params;
    const { top } = useSafeAreaInsets();

    const webViewRef = useRef(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const [simulating,  setSimulating]  = useState(false);
    const handled = useRef(false);

    const processReturnUrl = useCallback(async (url) => {
        let urlObj;
        try { urlObj = new URL(url); } catch { return false; }

        const path = urlObj.pathname;
        const isMoMoReturn  = path.includes("momo/return");
        const isVNPayReturn = path.includes("vnpay/return");
        if (!isMoMoReturn && !isVNPayReturn) return false;

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

        try {
            const ep = isMoMoReturn ? endpoints["momo-return"] : endpoints["vnpay-return"];
            await apis.get(ep, { params });
        } catch (_) {}

        nav.replace("payment-result", {
            success,
            paymentId,
            method,
            fromBooking,
            message: success
                ? "Thanh toán thành công!"
                : `Thanh toán thất bại (mã: ${errorCode})`,
        });

        return true;
    }, [nav, paymentId, method, fromBooking]);

    const handleReturnUrl = useCallback((url) => {
        let urlObj;
        try { urlObj = new URL(url); } catch { return false; }
        const path = urlObj.pathname;
        const isReturn = path.includes("momo/return") || path.includes("vnpay/return");
        if (!isReturn) return false;
        if (!handled.current) {
            handled.current = true;
            processReturnUrl(url);
        }
        return true;
    }, [processReturnUrl]);

    const onShouldStartLoadWithRequest = useCallback((request) => {
        const url = request.url;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return false;
        }
        const blocked = handleReturnUrl(url);
        return !blocked;
    }, [handleReturnUrl]);

    const onNavigationStateChange = useCallback((navState) => {
        handleReturnUrl(navState.url);
    }, [handleReturnUrl]);

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
                { text: "Hủy giao dịch", style: "destructive", onPress: () => nav.goBack() },
            ]
        );

    const handleSimulate = async () => {
        if (!paymentId) return;
        setSimulating(true);
        try {
            await authApis(user.token).post(endpoints["payment-simulate"](paymentId));
            nav.replace("payment-result", {
                success: true,
                paymentId,
                method,
                fromBooking,
                message: "Thanh toán thành công! (giả lập)",
            });
        } catch (e) {
            Alert.alert("Lỗi", e?.response?.data?.detail || "Không thể giả lập thanh toán.");
            setSimulating(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={[S.header, { paddingTop: top + 14 }]}>
                <TouchableOpacity style={S.closeBtn} onPress={handleClose}>
                    <Text style={S.closeText}>✕  Đóng</Text>
                </TouchableOpacity>
                <Text style={S.headerTitle}>
                    {method === "momo" ? "Thanh toán MoMo" : "Thanh toán VNPay"}
                </Text>
                {__DEV__ && (
                    <TouchableOpacity
                        onPress={handleSimulate}
                        disabled={simulating}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 8, opacity: simulating ? 0.5 : 1 }}
                    >
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                            {simulating ? "..." : "✓ Test"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {loadingPage && (
                <View style={S.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={S.loadingText}>Đang kết nối cổng thanh toán…</Text>
                </View>
            )}

            <WebView
                ref={webViewRef}
                source={{ uri: paymentUrl }}
                userAgent="Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
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

export default PaymentWebView;
