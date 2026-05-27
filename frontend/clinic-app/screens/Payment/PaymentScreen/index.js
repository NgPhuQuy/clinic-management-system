import {
    View, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../../configs/Apis";
import { MyUserContext } from "../../../contexts/MyContext";
import Styles, { COLORS } from "../../../styles/Styles";
import S from "./Styles";

const ALL_METHODS = [
    {
        key: "momo",
        label: "Ví MoMo",
        sub: "Thanh toán qua ứng dụng MoMo",
        icon: "wallet",
        iconBg: "#ae2070",
        iconColor: "#fff",
    },
    {
        key: "vnpay",
        label: "VNPay QR",
        sub: "Quét mã QR hoặc Internet Banking",
        icon: "qrcode-scan",
        iconBg: "#005baf",
        iconColor: "#fff",
    },
    {
        key: "cash",
        label: "Tiền mặt",
        sub: "Thanh toán tại quầy thu ngân",
        icon: "cash",
        iconBg: COLORS.greenPale,
        iconColor: COLORS.green,
    },
];

const PaymentScreen = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);

    const { invoiceId, appointmentId, doctorName, appointmentDate, amount, fromBooking = false } = route.params;

    const METHODS = fromBooking
        ? ALL_METHODS.filter((m) => m.key !== "cash")
        : ALL_METHODS;

    const [selectedMethod, setSelectedMethod] = useState(null);
    const [loading, setLoading] = useState(false);

    const handlePay = async () => {
        if (!selectedMethod) {
            Alert.alert("Chọn phương thức", "Vui lòng chọn phương thức thanh toán.");
            return;
        }

        if (!invoiceId) {
            Alert.alert("Lỗi", "Không tìm thấy mã hóa đơn. Vui lòng quay lại và thử lại.");
            return;
        }

        try {
            setLoading(true);
            const res = await authApis(user.token).post(endpoints["payment-init"], {
                invoice_id: invoiceId,
                payment_method: selectedMethod,
            });

            const { payment_url, payment_id, message } = res.data;

            if (selectedMethod === "cash") {
                nav.replace("payment-result", {
                    success: false,
                    paymentId: payment_id,
                    method: selectedMethod,
                    isCash: true,
                    fromBooking,
                    message: message || "Vui lòng đến quầy thu ngân khi đến khám.",
                });
                return;
            }

            if (!payment_url) {
                Alert.alert("Lỗi", res.data.detail || "Không nhận được đường dẫn thanh toán.");
                return;
            }

            nav.navigate("payment-webview", {
                paymentUrl: payment_url,
                paymentId: payment_id,
                method: selectedMethod,
                fromBooking,
            });
        } catch (e) {
            const msg =
                e?.response?.data?.detail ||
                e?.response?.data?.error ||
                "Không thể tạo thanh toán, thử lại sau.";
            Alert.alert("Lỗi thanh toán", msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={Styles.container} contentContainerStyle={{ paddingBottom: 32 }}>

            <View style={[Styles.card, { margin: 16, marginBottom: 8 }]}>
                <Text style={Styles.sectionHeader}>Thông tin thanh toán</Text>
                <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Bác sĩ</Text>
                    <Text style={S.infoValue}>BS. {doctorName}</Text>
                </View>
                <View style={S.infoRow}>
                    <Text style={S.infoLabel}>Ngày khám</Text>
                    <Text style={S.infoValue}>
                        {new Date(appointmentDate).toLocaleString("vi-VN")}
                    </Text>
                </View>
                <View style={S.divider} />
                <View style={[S.infoRow, { marginTop: 4 }]}>
                    <Text style={[S.infoLabel, { fontWeight: "700", color: COLORS.text }]}>
                        Tổng tiền
                    </Text>
                    <Text style={S.amountText}>
                        {Number(amount).toLocaleString("vi-VN")}đ
                    </Text>
                </View>
            </View>

            <Text style={S.sectionLabel}>CHỌN PHƯƠNG THỨC THANH TOÁN</Text>

            {fromBooking && (
                <View style={S.onlineNote}>
                    <MaterialCommunityIcons name="shield-check" size={14} color="#1565c0" />
                    <Text style={S.onlineNoteText}>
                        Đặt lịch trực tuyến yêu cầu thanh toán qua ví điện tử hoặc chuyển khoản
                    </Text>
                </View>
            )}

            {METHODS.map((m) => {
                const selected = selectedMethod === m.key;
                return (
                    <TouchableOpacity
                        key={m.key}
                        style={[S.methodCard, selected && S.methodCardSelected]}
                        onPress={() => setSelectedMethod(m.key)}
                        activeOpacity={0.75}
                    >
                        <View style={[S.methodIcon, { backgroundColor: m.iconBg }]}>
                            <MaterialCommunityIcons name={m.icon} size={22} color={m.iconColor} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={[S.methodLabel, selected && { color: COLORS.primary }]}>
                                {m.label}
                            </Text>
                            <Text style={S.methodSub}>{m.sub}</Text>
                        </View>
                        <View style={[S.radio, selected && S.radioSelected]}>
                            {selected && <View style={S.radioDot} />}
                        </View>
                    </TouchableOpacity>
                );
            })}

            <View style={{ marginHorizontal: 16, marginTop: 20 }}>
                <TouchableOpacity
                    style={[Styles.btnPrimary, (!selectedMethod || loading) && { opacity: 0.5 }]}
                    onPress={handlePay}
                    disabled={!selectedMethod || loading}
                    activeOpacity={0.8}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={Styles.btnPrimaryText}>
                            {selectedMethod === "cash" ? "Xác nhận thanh toán tiền mặt" : "Tiến hành thanh toán →"}
                        </Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity
                    style={Styles.btnOutline}
                    onPress={() => nav.goBack()}
                    disabled={loading}
                >
                    <Text style={Styles.btnOutlineText}>Quay lại</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
};

export default PaymentScreen;
