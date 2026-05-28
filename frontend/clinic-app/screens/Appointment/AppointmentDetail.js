import { View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Image } from "react-native";
import { Text, Button } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";
import { appointmentDetailStyles as styles } from "./Styles";

const STATUS_COLORS = {
    pending: "#ff9800", confirmed: "#4caf50", cancelled: "#f44336",
    completed: "#2196f3", no_show: "#9e9e9e", in_progress: "#9c27b0",
};
const STATUS_LABELS = {
    pending: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã hủy",
    completed: "Hoàn thành", no_show: "Không đến", in_progress: "Đang khám",
};
const PAY_STATUS_COLORS = {
    pending: "#ff9800", success: "#4caf50", failed: "#f44336", refunded: "#9c27b0",
};
const PAY_STATUS_LABELS = {
    pending: "Chờ thanh toán", success: "Đã thanh toán", failed: "Thất bại", refunded: "Đã hoàn tiền",
};
const PAY_METHOD_LABELS = {
    momo: "MoMo", vnpay: "VNPay", cash: "Tiền mặt",
    banking: "Chuyển khoản", credit_card: "Thẻ tín dụng",
};
const PAY_METHOD_ICONS = {
    momo: "wallet", vnpay: "qrcode-scan", cash: "cash",
    banking: "bank-transfer", credit_card: "credit-card",
};

const InfoRow = ({ icon, iconColor = COLORS.primary, iconBg, label, value, last }) => (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
        <View style={[styles.infoIcon, { backgroundColor: iconBg || COLORS.primaryPale }]}>
            <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const DoctorAvatar = ({ uri, size = 46 }) => {
    const [err, setErr] = useState(false);
    if (uri && !err) return (
        <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            onError={() => setErr(true)}
        />
    );
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.primaryPale, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="doctor" size={size * 0.52} color={COLORS.primary} />
        </View>
    );
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

    const calcTotal = (a) => {
        const fee = Number(a.doctor_info?.consultation_fee || 0);
        const svc = (a.appointment_services || []).reduce(
            (s, x) => s + Number(x.price_at_time || 0) * (x.quantity || 1), 0
        );
        return fee + svc;
    };

    const cancelAppointment = () => {
        Alert.alert(
            "Xác nhận hủy lịch",
            "Bạn có chắc muốn hủy lịch hẹn này?\nNếu đã thanh toán, tiền sẽ được hoàn lại.",
            [
                { text: "Không", style: "cancel" },
                {
                    text: "Hủy lịch",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setCancelling(true);
                            const res = await authApis(user.token).patch(
                                endpoints["appointment-status"](id),
                                { status: "cancelled" }
                            );
                            setAppt(res.data);
                        } catch (e) {
                            const msg = e?.response?.data?.status?.[0]
                                || e?.response?.data?.detail
                                || "Không thể hủy. Vui lòng thử lại!";
                            Alert.alert("Lỗi", msg);
                        } finally {
                            setCancelling(false);
                        }
                    },
                },
            ]
        );
    };

    const goToPayment = () => {
        const invoice = appt.invoice;
        if (!invoice?.id) {
            Alert.alert("Lỗi", "Không tìm thấy hóa đơn. Vui lòng thử lại sau.");
            return;
        }
        const amount = Number(invoice?.remaining ?? invoice?.total_amount ?? calcTotal(appt));
        nav.navigate("payment-screen", {
            invoiceId: invoice.id,
            appointmentId: appt.id,
            doctorName: appt.doctor_info?.full_name || appt.doctor_name || `#${appt.doctor}`,
            appointmentDate: appt.appointment_date,
            amount,
        });
    };

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    if (!appt) return <View style={[Styles.center, { flex: 1 }]}><Text>Không tìm thấy lịch hẹn</Text></View>;

    const invoice   = appt.invoice;
    const payments  = invoice?.payments ?? [];
    const payment   = payments.find(p => p.status === "success")
                   ?? payments.find(p => p.status === "pending")
                   ?? payments[0]
                   ?? null;
    const total         = calcTotal(appt);
    const remaining     = Number(invoice?.remaining ?? total);
    const hasPending    = payments.some(p => p.status === "pending");
    const canPay        = ["pending", "confirmed", "completed", "in_progress"].includes(appt.status)
                       && remaining > 0 && !hasPending;
    const alreadyPaid   = remaining <= 0 || payment?.status === "success";
    const canCancel     = appt.status === "pending" || appt.status === "confirmed";
    const wasRefunded   = payments.some(p => p.status === "refunded");

    const doctorAvatar = appt.doctor_info?.avatar || appt.doctor_info?.avatar_url;

    return (
        <ScrollView style={Styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={[styles.statusBanner, { backgroundColor: STATUS_COLORS[appt.status] || "#9e9e9e" }]}>
                <MaterialCommunityIcons
                    name={appt.status === "completed" ? "check-circle" : appt.status === "cancelled" ? "close-circle" : "clock-outline"}
                    size={22} color="#fff"
                />
                <Text style={styles.statusText}>{STATUS_LABELS[appt.status] || appt.status}</Text>
            </View>

            <View style={Styles.padding}>
                <View style={[Styles.card, styles.doctorCard]}>
                    <DoctorAvatar uri={doctorAvatar} size={52} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.doctorName}>
                            BS. {appt.doctor_info?.full_name || appt.doctor_name || `#${appt.doctor}`}
                        </Text>
                        {appt.doctor_info?.specialty_name && (
                            <Text style={styles.doctorSpec}>{appt.doctor_info.specialty_name}</Text>
                        )}
                    </View>
                    <View style={[Styles.badge, { backgroundColor: STATUS_COLORS[appt.status] + "22" }]}>
                        <Text style={[Styles.badgeText, { color: STATUS_COLORS[appt.status] }]}>
                            #{appt.id}
                        </Text>
                    </View>
                </View>

                <View style={Styles.card}>
                    <Text style={styles.cardTitle}>Chi tiết lịch hẹn</Text>
                    <InfoRow
                        icon="calendar-clock"
                        iconBg="#e3f2fd"
                        label="Ngày giờ khám"
                        value={new Date(appt.appointment_date).toLocaleString("vi-VN")}
                    />
                    {appt.reason && (
                        <InfoRow
                            icon="stethoscope"
                            iconBg="#e8f5e9"
                            iconColor={COLORS.green}
                            label="Lý do khám"
                            value={appt.reason}
                        />
                    )}
                    {appt.notes && (
                        <InfoRow
                            icon="note-text-outline"
                            iconBg="#fff3e0"
                            iconColor={COLORS.orange}
                            label="Ghi chú"
                            value={appt.notes}
                        />
                    )}
                    <InfoRow
                        icon="clock-plus-outline"
                        iconBg="#f3e5f5"
                        iconColor={COLORS.purple}
                        label="Đặt lúc"
                        value={new Date(appt.created_at).toLocaleString("vi-VN")}
                        last
                    />
                </View>

                {(appt.appointment_services?.length > 0 || appt.doctor_info?.consultation_fee > 0) && (
                    <View style={Styles.card}>
                        <Text style={styles.cardTitle}>Chi phí khám</Text>
                        {appt.doctor_info?.consultation_fee > 0 && (
                            <View style={styles.costRow}>
                                <Text style={styles.costLabel}>Phí khám cơ bản</Text>
                                <Text style={styles.costValue}>
                                    {Number(appt.doctor_info.consultation_fee).toLocaleString("vi-VN")}đ
                                </Text>
                            </View>
                        )}
                        {(appt.appointment_services || []).map((s, i) => (
                            <View key={i} style={styles.costRow}>
                                <Text style={styles.costLabel}>{s.service_name || s.service}</Text>
                                <Text style={styles.costValue}>
                                    {Number(s.price_at_time).toLocaleString("vi-VN")}đ
                                </Text>
                            </View>
                        ))}
                        <View style={styles.costDivider} />
                        <View style={styles.costRow}>
                            <Text style={[styles.costLabel, { fontWeight: "700", color: COLORS.text }]}>Tổng cộng</Text>
                            <Text style={styles.totalValue}>{total.toLocaleString("vi-VN")}đ</Text>
                        </View>
                    </View>
                )}

                <View style={Styles.card}>
                    <Text style={styles.cardTitle}>Thanh toán</Text>

                    {wasRefunded && (
                        <View style={styles.refundBanner}>
                            <MaterialCommunityIcons name="cash-refund" size={18} color={COLORS.purple} />
                            <Text style={styles.refundText}>Đã hoàn tiền do hủy lịch</Text>
                        </View>
                    )}

                    {payment ? (
                        <>
                            <View style={styles.payRow}>
                                <Text style={styles.payLabel}>Trạng thái</Text>
                                <View style={[Styles.badge, { backgroundColor: PAY_STATUS_COLORS[payment.status] + "22" }]}>
                                    <Text style={[Styles.badgeText, { color: PAY_STATUS_COLORS[payment.status] }]}>
                                        {PAY_STATUS_LABELS[payment.status] || payment.status}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.payRow}>
                                <Text style={styles.payLabel}>Số tiền</Text>
                                <Text style={styles.payAmount}>
                                    {Number(payment.amount).toLocaleString("vi-VN")}đ
                                </Text>
                            </View>
                            {payment.payment_method && (
                                <View style={styles.payRow}>
                                    <Text style={styles.payLabel}>Phương thức</Text>
                                    <View style={styles.payMethodRow}>
                                        <MaterialCommunityIcons
                                            name={PAY_METHOD_ICONS[payment.payment_method] || "credit-card-outline"}
                                            size={15} color={COLORS.primary}
                                        />
                                        <Text style={styles.payMethodText}>
                                            {" "}{PAY_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {payment.paid_at && (
                                <View style={[styles.payRow, { borderBottomWidth: 0 }]}>
                                    <Text style={styles.payLabel}>Thanh toán lúc</Text>
                                    <Text style={styles.payMeta}>
                                        {new Date(payment.paid_at).toLocaleString("vi-VN")}
                                    </Text>
                                </View>
                            )}
                            {!payment.paid_at && (
                                <View style={[styles.payRow, { borderBottomWidth: 0 }]}>
                                    <Text style={styles.payLabel}>Tạo lúc</Text>
                                    <Text style={styles.payMeta}>
                                        {new Date(payment.created_at).toLocaleString("vi-VN")}
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <Text style={[Styles.textSmall, { color: COLORS.textMuted, paddingVertical: 8 }]}>
                            Chưa có thông tin thanh toán.
                        </Text>
                    )}

                    {canPay && (
                        <TouchableOpacity style={styles.payBtn} onPress={goToPayment} activeOpacity={0.85}>
                            <MaterialCommunityIcons name="credit-card-outline" size={18} color="#fff" />
                            <Text style={styles.payBtnText}>
                                {payment?.status === "failed" ? "Thanh toán lại" : "Thanh toán ngay"}
                                {"  "}·{"  "}{remaining.toLocaleString("vi-VN")}đ
                            </Text>
                        </TouchableOpacity>
                    )}

                    {alreadyPaid && !wasRefunded && (
                        <View style={styles.paidTag}>
                            <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.green} />
                            <Text style={styles.paidTagText}> Đã thanh toán hoàn tất</Text>
                        </View>
                    )}
                </View>

                {appt.consultation_id && ["confirmed", "in_progress"].includes(appt.status) && (
                    <TouchableOpacity
                        style={styles.consultBtn}
                        onPress={() => nav.navigate("consultation-room", { consultationId: appt.consultation_id })}
                        activeOpacity={0.85}
                    >
                        <MaterialCommunityIcons name="video" size={20} color="#fff" />
                        <Text style={styles.consultBtnText}>Vào phòng khám trực tuyến</Text>
                    </TouchableOpacity>
                )}

                {appt.medical_record_id && (
                    <Button
                        mode="outlined"
                        icon="clipboard-medical"
                        onPress={() => nav.navigate("medical-record-detail", { id: appt.medical_record_id })}
                        style={{ borderRadius: 10, marginBottom: 12 }}
                        textColor={COLORS.primary}
                    >
                        Xem hồ sơ bệnh án
                    </Button>
                )}

                {canCancel && (
                    <TouchableOpacity
                        style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
                        onPress={cancelAppointment}
                        disabled={cancelling}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="calendar-remove" size={18} color={COLORS.red} />
                        <Text style={styles.cancelBtnText}>
                            {cancelling ? "Đang hủy..." : "Hủy lịch hẹn"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
};


export default AppointmentDetail;
