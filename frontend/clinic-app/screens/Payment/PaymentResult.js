import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS, paymentResultStyles as S } from "../../styles/Styles";

const METHOD_LABELS = { momo: "MoMo", vnpay: "VNPay", cash: "Tiền mặt" };

const PaymentResult = () => {
    const nav   = useNavigation();
    const route = useRoute();
    const { success, paymentId, method, message, isCash, fromBooking = false } = route.params;

    const isCashPending = isCash && !success;

    const handlePrimaryAction = () => {
        if (success || isCashPending) {
            if (fromBooking) {
                nav.navigate("my-appointments");
            } else {
                nav.pop(2);
            }
        } else {
            nav.pop(1);
        }
    };

    return (
        <View style={S.container}>
            <View style={[
                S.iconCircle,
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
                S.title,
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

            <Text style={S.message}>{message}</Text>

            {paymentId && (
                <View style={S.infoBox}>
                    <Text style={S.infoLine}>Mã thanh toán: #{paymentId}</Text>
                    <Text style={S.infoLine}>
                        Phương thức: {METHOD_LABELS[method] || method}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[
                    S.btn,
                    {
                        backgroundColor: success
                            ? COLORS.primary
                            : isCashPending ? "#f57c00" : COLORS.red
                    }
                ]}
                onPress={handlePrimaryAction}
            >
                <Text style={S.btnText}>
                    {success
                        ? "Xem lịch hẹn của tôi"
                        : isCashPending
                            ? "Xem lịch hẹn của tôi"
                            : "Thử lại"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={S.btnOutline}
                onPress={() => nav.navigate("home-main")}
            >
                <Text style={S.btnOutlineText}>Về trang chủ</Text>
            </TouchableOpacity>
        </View>
    );
};
export default PaymentResult;