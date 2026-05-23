import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS } from "../../styles/Styles";

const METHOD_LABELS = { momo: "MoMo", vnpay: "VNPay", cash: "Tiền mặt" };

const PaymentResult = () => {
    const nav   = useNavigation();
    const route = useRoute();
    const { success, paymentId, method, message, isCash, fromBooking = false } = route.params;

    // isCash là trường hợp đặc biệt → luôn hiển thị màn "chờ thanh toán tại quầy"
    const isCashPending = isCash && !success;

    const handlePrimaryAction = () => {
        if (success || isCashPending) {
            // ✅ Từ luồng đặt lịch → về "Lịch hẹn của tôi"
            if (fromBooking) {
                nav.navigate("my-appointments");
            } else {
                // Từ AppointmentDetail → pop(2) về AppointmentDetail
                // Stack: AppointmentDetail → PaymentScreen → PaymentResult (WebView đã bị replace)
                nav.pop(2);
            }
        } else {
            // Thất bại → quay lại PaymentScreen để chọn lại
            nav.pop(1);
        }
    };

    return (
        <View style={styles.container}>
            <View style={[
                styles.iconCircle,
                {
                    backgroundColor: success
                        ? "#e8f5e9"
                        : isCashPending ? "#fff8e1" : "#fce4ec"
                }
            ]}>
                <Text style={{ fontSize: 56 }}>
                    {success ? "✅" : isCashPending ? "🏥" : "❌"}
                </Text>
            </View>

            <Text style={[
                styles.title,
                {
                    color: success
                        ? COLORS.green
                        : isCashPending ? "#f57c00" : COLORS.red
                }
            ]}>
                {success
                    ? "Thanh toán thành công!"
                    : isCashPending
                        ? "Đăng ký lịch hẹn thành công"
                        : "Thanh toán thất bại"}
            </Text>

            <Text style={styles.message}>{message}</Text>

            {paymentId && (
                <View style={styles.infoBox}>
                    <Text style={styles.infoLine}>Mã thanh toán: #{paymentId}</Text>
                    <Text style={styles.infoLine}>
                        Phương thức: {METHOD_LABELS[method] || method}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[
                    styles.btn,
                    {
                        backgroundColor: success
                            ? COLORS.primary
                            : isCashPending ? "#f57c00" : COLORS.red
                    }
                ]}
                onPress={handlePrimaryAction}
            >
                <Text style={styles.btnText}>
                    {success
                        ? "Xem lịch hẹn của tôi"
                        : isCashPending
                            ? "Xem lịch hẹn của tôi"
                            : "Thử lại"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => nav.navigate("home-main")}
            >
                <Text style={styles.btnOutlineText}>Về trang chủ</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    iconCircle: {
        width: 110, height: 110, borderRadius: 55,
        alignItems: "center", justifyContent: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 22, fontWeight: "800",
        marginBottom: 8, textAlign: "center",
    },
    message: {
        fontSize: 13, color: COLORS.textMuted,
        textAlign: "center", marginBottom: 24, lineHeight: 20,
    },
    infoBox: {
        backgroundColor: "#fff", borderRadius: 12,
        padding: 14, width: "100%", marginBottom: 28,
        borderWidth: 1, borderColor: COLORS.border, gap: 4,
    },
    infoLine: { fontSize: 12, color: COLORS.textMuted, textAlign: "center" },
    btn: {
        width: "100%", borderRadius: 14, paddingVertical: 14,
        alignItems: "center", marginBottom: 10, elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8,
    },
    btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    btnOutline: {
        width: "100%", borderRadius: 14, paddingVertical: 13,
        alignItems: "center", borderWidth: 1.5, borderColor: COLORS.primary,
    },
    btnOutlineText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
});

export default PaymentResult;
