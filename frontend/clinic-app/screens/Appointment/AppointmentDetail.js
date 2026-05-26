import { View, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { Text, Button } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const STATUS_COLORS = {
    pending: "#ff9800", confirmed: "#4caf50", cancelled: "#f44336",
    completed: "#2196f3", no_show: "#9e9e9e", in_progress: "#9c27b0"
};
const STATUS_LABELS = {
    pending: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã hủy",
    completed: "Hoàn thành", no_show: "Không đến", in_progress: "Đang khám"
};

const PAY_STATUS_COLORS = {
    pending: "#ff9800", success: "#4caf50", failed: "#f44336", refunded: "#9c27b0"
};
const PAY_STATUS_LABELS = {
    pending: "Chờ thanh toán", success: "Đã thanh toán", failed: "Thất bại", refunded: "Hoàn tiền"
};
const PAY_METHOD_LABELS = {
    momo: "MoMo", vnpay: "VNPay", cash: "Tiền mặt",
    banking: "Chuyển khoản", credit_card: "Thẻ tín dụng"
};

const AppointmentDetail = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { id } = route.params;

    const [appt, setAppt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    const loadAppt = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["appointment-detail"](id));
            setAppt(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAppt(); }, [id]);

    // Tính tổng tiền từ dữ liệu appointment
    const calcTotal = (a) => {
        const fee = Number(a.doctor_info?.consultation_fee || 0);
        const svc = (a.appointment_services || []).reduce(
            (s, x) => s + Number(x.price_at_time || 0) * (x.quantity || 1), 0
        );
        return fee + svc;
    };

    const cancelAppointment = () => {
        Alert.alert("Xác nhận hủy", "Bạn có chắc muốn hủy lịch hẹn này?", [
            { text: "Không", style: "cancel" },
            {
                text: "Hủy lịch",
                style: "destructive",
                onPress: async () => {
                    try {
                        setCancelling(true);
                        await authApis(user.token).patch(endpoints["appointment-status"](id), { status: "cancelled" });
                        setAppt({ ...appt, status: "cancelled" });
                    } catch (e) {
                        const msg = e?.response?.data?.status?.[0] || e?.response?.data?.detail || "Không thể hủy. Vui lòng thử lại!";
                        Alert.alert("Lỗi", msg);
                    } finally {
                        setCancelling(false);
                    }
                },
            },
        ]);
    };

    const goToPayment = () => {
        const invoice = appt.invoice;
        const invoiceId = invoice?.id;

        if (!invoiceId) {
            Alert.alert("Lỗi", "Không tìm thấy hóa đơn cho lịch hẹn này. Vui lòng thử lại sau.");
            return;
        }

        // Ưu tiên dùng invoice.remaining (số tiền còn lại cần thanh toán)
        const amount = Number(invoice?.remaining ?? invoice?.total_amount ?? calcTotal(appt));

        nav.navigate("payment-screen", {
            invoiceId,
            invoiceId,
            appointmentId: appt.id,
            doctorName: appt.doctor_info?.full_name || appt.doctor_name || `#${appt.doctor}`,
            appointmentDate: appt.appointment_date,
            amount,
            amount,
        });
    };

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    if (!appt) return <View style={[Styles.center, { flex: 1 }]}><Text>Không tìm thấy lịch hẹn</Text></View>;

    // API trả về appt.invoice (InvoiceSerializer), không phải appt.payment
    // Lấy payment mới nhất (payments sắp xếp -created_at)
    const invoice    = appt.invoice;
    const payments   = invoice?.payments ?? [];
    // Payment hiển thị: ưu tiên success → pending → mới nhất
    const payment    = payments.find(p => p.status === "success")
                    ?? payments.find(p => p.status === "pending")
                    ?? payments[0]
                    ?? null;
    const total      = calcTotal(appt);
    const remaining  = Number(invoice?.remaining ?? total);
    // Có thể thanh toán khi: lịch chưa hủy + còn tiền cần trả + không có payment đang pending
    const hasPendingPayment = payments.some(p => p.status === "pending");
    const canPay     = ["pending", "confirmed", "completed", "in_progress"].includes(appt.status)
        && remaining > 0
        && !hasPendingPayment;
    const alreadyPaid = remaining <= 0 || payment?.status === "success";

    return (
        <ScrollView style={Styles.container}>
            <View style={[styles.statusBanner, { backgroundColor: STATUS_COLORS[appt.status] || "#9e9e9e" }]}>
                <Text style={styles.statusText}>{STATUS_LABELS[appt.status] || appt.status}</Text>
            </View>

            <View style={Styles.padding}>
                <View style={Styles.card}>
                    <Text style={Styles.sectionHeader}>Thông tin lịch hẹn</Text>
                    <Text style={Styles.text}>👨‍⚕️ Bác sĩ: BS. {appt.doctor_info?.full_name || appt.doctor_name || appt.doctor}</Text>
                    <Text style={[Styles.text, { marginTop: 6 }]}>📅 Ngày giờ: {new Date(appt.appointment_date).toLocaleString("vi-VN")}</Text>
                    {appt.reason && <Text style={[Styles.text, { marginTop: 6 }]}>📝 Lý do: {appt.reason}</Text>}
                    {appt.notes  && <Text style={[Styles.text, { marginTop: 6 }]}>📌 Ghi chú: {appt.notes}</Text>}
                    <Text style={[Styles.textSmall, { marginTop: 8 }]}>Đặt lúc: {new Date(appt.created_at).toLocaleString("vi-VN")}</Text>
                </View>

                {(appt.appointment_services?.length > 0 || appt.doctor_info?.consultation_fee > 0) && (
                    <View style={Styles.card}>
                        <Text style={Styles.sectionHeader}>Chi phí khám</Text>

                        {/* Phí khám */}
                        {appt.doctor_info?.consultation_fee > 0 && (
                            <View style={[Styles.row, { justifyContent: "space-between", marginBottom: 6 }]}>
                                <Text style={Styles.text}>Phí khám cơ bản</Text>
                                <Text style={[Styles.text, { color: COLORS.primary, fontWeight: "600" }]}>
                                    {Number(appt.doctor_info.consultation_fee).toLocaleString("vi-VN")}đ
                                </Text>
                            </View>
                        )}

                        {appt.appointment_services.map((s, idx) => (
                            <View key={idx} style={[Styles.row, { justifyContent: "space-between", marginBottom: 6 }]}>
                                <Text style={Styles.text}>{s.service_name || s.service}</Text>
                                <Text style={[Styles.text, { color: COLORS.primary, fontWeight: "600" }]}>
                                    {Number(s.price_at_time).toLocaleString("vi-VN")}đ
                                </Text>
                            </View>
                        ))}

                        <View style={Styles.divider} />
                        <View style={[Styles.row, { justifyContent: "space-between" }]}>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.text }}>Tổng cộng</Text>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.primary }}>
                                {total.toLocaleString("vi-VN")}đ
                            </Text>
                        </View>
                    </View>
                )}

                <View style={Styles.card}>
                    <Text style={Styles.sectionHeader}>Thanh toán</Text>

                    {payment ? (
                        <>
                            <View style={[Styles.row, { justifyContent: "space-between", marginBottom: 8 }]}>
                                <Text style={Styles.text}>Trạng thái</Text>
                                <View style={[Styles.badge, { backgroundColor: PAY_STATUS_COLORS[payment.status] || "#9e9e9e" }]}>
                                    <Text style={Styles.badgeText}>{PAY_STATUS_LABELS[payment.status] || payment.status}</Text>
                                </View>
                            </View>

                            <View style={[Styles.row, { justifyContent: "space-between", marginBottom: 6 }]}>
                                <Text style={Styles.text}>Số tiền</Text>
                                <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.primary }}>
                                    {Number(payment.amount).toLocaleString("vi-VN")}đ
                                </Text>
                            </View>

                            {payment.payment_method && (
                                <View style={[Styles.row, { justifyContent: "space-between", marginBottom: 6 }]}>
                                    <Text style={Styles.text}>Phương thức</Text>
                                    <Text style={[Styles.text, { fontWeight: "600" }]}>
                                        {PAY_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                    </Text>
                                </View>
                            )}

                            {payment.paid_at && (
                                <View style={[Styles.row, { justifyContent: "space-between" }]}>
                                    <Text style={Styles.text}>Thời gian</Text>
                                    <Text style={Styles.textSmall}>{new Date(payment.paid_at).toLocaleString("vi-VN")}</Text>
                                </View>
                            )}

                            {payment.status === "failed" && (
                                <Text style={[Styles.textSmall, { color: COLORS.redLight, marginTop: 6 }]}>
                                    ⚠ Giao dịch thất bại. Bạn có thể thử lại bên dưới.
                                </Text>
                            )}
                        </>
                    ) : (
                        <Text style={Styles.text}>Chưa có thông tin thanh toán.</Text>
                    )}

                    {/* Nút thanh toán ngay */}
                    {canPay && (
                        <TouchableOpacity style={[styles.payBtn]} onPress={goToPayment} activeOpacity={0.85}>
                            <MaterialCommunityIcons name="credit-card-outline" size={20} color="#fff" />
                            <Text style={styles.payBtnText}>
                                {payment?.status === "failed" ? "Thanh toán lại" : "Thanh toán ngay"}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {alreadyPaid && (
                        <View style={styles.paidTag}>
                            <Text style={styles.paidTagText}>✓ Đã thanh toán hoàn tất</Text>
                        </View>
                    )}
                </View>

                {/* Hồ sơ bệnh án */}
                {appt.medical_record_id && (
                    <Button
                        mode="outlined"
                        icon="clipboard-medical"
                        onPress={() => nav.navigate("medical-record-detail", { id: appt.medical_record_id })}
                        style={{ borderRadius: 8, marginBottom: 12 }}
                        textColor={COLORS.primary}
                    >
                        Xem hồ sơ bệnh án
                    </Button>
                )}

                {/* Hủy lịch */}
                {(appt.status === "pending" || appt.status === "confirmed") && (
                    <Button
                        mode="contained"
                        buttonColor="#f44336"
                        onPress={cancelAppointment}
                        loading={cancelling}
                        disabled={cancelling}
                        style={{ borderRadius: 8 }}
                        icon="cancel"
                    >
                        Hủy lịch hẹn
                    </Button>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    statusBanner: {
        padding: 16,
        alignItems: "center",
    },
    statusText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    payBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 13,
        marginTop: 14,
        gap: 8,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    payBtnText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 15,
    },
    paidTag: {
        backgroundColor: "#e8f5e9",
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: "center",
        marginTop: 12,
    },
    paidTagText: {
        color: COLORS.green,
        fontWeight: "700",
        fontSize: 13,
    },
});

export default AppointmentDetail;