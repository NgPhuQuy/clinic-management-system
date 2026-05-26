import {
    View, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

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

    // fromBooking = true khi đến từ BookAppointment, false khi đến từ AppointmentDetail
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

            // Tiền mặt → chuyển thẳng tới màn kết quả
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

            // MoMo / VNPay → mở WebView
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
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Bác sĩ</Text>
                    <Text style={styles.infoValue}>BS. {doctorName}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ngày khám</Text>
                    <Text style={styles.infoValue}>
                        {new Date(appointmentDate).toLocaleString("vi-VN")}
                    </Text>
                </View>
                <View style={styles.divider} />
                <View style={[styles.infoRow, { marginTop: 4 }]}>
                    <Text style={[styles.infoLabel, { fontWeight: "700", color: COLORS.text }]}>
                        Tổng tiền
                    </Text>
                    <Text style={styles.amountText}>
                        {Number(amount).toLocaleString("vi-VN")}đ
                    </Text>
                </View>
            </View>

            <Text style={styles.sectionLabel}>CHỌN PHƯƠNG THỨC THANH TOÁN</Text>

            {fromBooking && (
                <View style={styles.onlineNote}>
                    <MaterialCommunityIcons name="shield-check" size={14} color="#1565c0" />
                    <Text style={styles.onlineNoteText}>
                        Đặt lịch trực tuyến yêu cầu thanh toán qua ví điện tử hoặc chuyển khoản
                    </Text>
                </View>
            )}

            {METHODS.map((m) => {
                const selected = selectedMethod === m.key;
                return (
                    <TouchableOpacity
                        key={m.key}
                        style={[styles.methodCard, selected && styles.methodCardSelected]}
                        onPress={() => setSelectedMethod(m.key)}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.methodIcon, { backgroundColor: m.iconBg }]}>
                            <MaterialCommunityIcons name={m.icon} size={22} color={m.iconColor} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={[styles.methodLabel, selected && { color: COLORS.primary }]}>
                                {m.label}
                            </Text>
                            <Text style={styles.methodSub}>{m.sub}</Text>
                        </View>
                        <View style={[styles.radio, selected && styles.radioSelected]}>
                            {selected && <View style={styles.radioDot} />}
                        </View>
                    </TouchableOpacity>
                );
            })}

            {/* Nút thanh toán */}
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

const styles = StyleSheet.create({
    sectionLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.textLight,
        letterSpacing: 0.8,
        marginLeft: 20,
        marginTop: 16,
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 5,
    },
    infoLabel: { fontSize: 12, color: COLORS.textMuted },
    infoValue: {
        fontSize: 13,
        color: COLORS.text,
        fontWeight: "500",
        flex: 1,
        textAlign: "right",
    },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
    amountText: { fontSize: 20, fontWeight: "800", color: COLORS.primary },
    methodCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        elevation: 1,
    },
    methodCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryPale,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    methodIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    methodLabel: { fontSize: 14, fontWeight: "700", color: COLORS.text },
    methodSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    radio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: COLORS.border,
        alignItems: "center", justifyContent: "center",
    },
    radioSelected: { borderColor: COLORS.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
    onlineNote: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#e3f2fd",
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 8,
        padding: 10,
        gap: 6,
    },
    onlineNoteText: { fontSize: 12, color: "#1565c0", flex: 1 },
});

export default PaymentScreen;