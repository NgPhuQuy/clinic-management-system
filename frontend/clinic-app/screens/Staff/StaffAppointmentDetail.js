import {
    View, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, staffAppointmentDetailStyles as S } from "../../styles/Styles";

const STATUS_COLORS = {
    pending: COLORS.orange, confirmed: COLORS.green, cancelled: COLORS.red,
    completed: COLORS.primary, no_show: COLORS.textLight, in_progress: COLORS.purple,
};
const STATUS_LABELS = {
    pending: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã hủy",
    completed: "Hoàn thành", no_show: "Không đến", in_progress: "Đang khám",
};
const PAY_STATUS_COLORS = {
    pending: COLORS.orange, success: COLORS.green, failed: COLORS.red, refunded: COLORS.purple,
};
const PAY_STATUS_LABELS = {
    pending: "Chờ thanh toán", success: "Đã thanh toán",
    failed: "Thất bại", refunded: "Hoàn tiền",
};
const PAY_METHOD_LABELS = {
    momo: "MoMo", vnpay: "VNPay", cash: "Tiền mặt",
    banking: "Chuyển khoản", credit_card: "Thẻ tín dụng",
};

const Section = ({ title, children }) => (
    <View style={S.card}>
        <Text style={S.cardTitle}>{title}</Text>
        {children}
    </View>
);

const InfoRow = ({ icon, label, value, valueColor }) => (
    <View style={S.infoRow}>
        <MaterialCommunityIcons name={icon} size={15} color={COLORS.primary} style={{ width: 20 }} />
        <Text style={S.infoLabel}>{label}:</Text>
        <Text style={[S.infoValue, valueColor && { color: valueColor }]}>{value || "—"}</Text>
    </View>
);

const StaffAppointmentDetail = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { id } = route.params;

    const [appt, setAppt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["appointment-detail"](id));
            setAppt(res.data);
        } catch (e) {
            console.error(e?.response?.data || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const doUpdateStatus = async (newStatus, label) => {
        Alert.alert("Xác nhận", `Chuyển sang trạng thái "${label}"?`, [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xác nhận",
                style: ["cancelled", "no_show"].includes(newStatus) ? "destructive" : "default",
                onPress: async () => {
                    try {
                        setUpdating(true);
                        const res = await authApis(user.token).patch(
                            endpoints["appointment-status"](id),
                            { status: newStatus }
                        );
                        setAppt(res.data);
                    } catch (e) {
                        const msg =
                            e?.response?.data?.status?.[0] ||
                            e?.response?.data?.detail ||
                            "Lỗi cập nhật trạng thái!";
                        Alert.alert("Lỗi", msg);
                    } finally {
                        setUpdating(false);
                    }
                },
            },
        ]);
    };

    if (loading) return (
        <View style={[Styles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );
    if (!appt) return (
        <View style={[Styles.center, { flex: 1 }]}>
            <Text>Không tìm thấy lịch hẹn</Text>
        </View>
    );

    const statusColor = STATUS_COLORS[appt.status] || COLORS.textMuted;
    const statusLabel = STATUS_LABELS[appt.status] || appt.status;
    const patient = appt.patient_info || {};
    const doctor = appt.doctor_info || {};
    const payment = appt.payment;
    const apptDate = new Date(appt.appointment_date);

    const canConfirm = appt.status === "pending";
    const canStart = appt.status === "confirmed";
    const canComplete = appt.status === "in_progress";
    const canCancel = ["pending", "confirmed", "in_progress"].includes(appt.status);
    const canNoShow = ["pending", "confirmed"].includes(appt.status);
    const canCollectCash =
        payment?.payment_method === "cash" &&
        payment?.status === "pending" &&
        ["confirmed", "in_progress", "completed"].includes(appt.status);

    return (
        <ScrollView style={S.container}>
            <View style={[S.statusBanner, { backgroundColor: statusColor }]}>
                <Text style={S.statusBannerLabel}>{statusLabel}</Text>
                <Text style={S.statusBannerDate}>
                    {apptDate.toLocaleDateString("vi-VN")} •{" "}
                    {apptDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </Text>
            </View>

            <Section title="Thông tin bệnh nhân">
                <InfoRow icon="account" label="Họ tên" value={patient.full_name} />
                <InfoRow icon="phone" label="Điện thoại" value={patient.phone} />
                <InfoRow icon="cake-variant" label="Ngày sinh" value={patient.date_of_birth} />
            </Section>

            <Section title="Bác sĩ điều trị">
                <InfoRow icon="doctor" label="Bác sĩ" value={`BS. ${doctor.full_name || ""}`} />
                <InfoRow icon="hospital" label="Chuyên khoa" value={doctor.specialty_name} />
                <InfoRow icon="cash" label="Phí khám"
                    value={doctor.consultation_fee
                        ? `${Number(doctor.consultation_fee).toLocaleString("vi-VN")}đ`
                        : null}
                />
            </Section>

            <Section title="Chi tiết lịch hẹn">
                <InfoRow icon="text-box-outline" label="Lý do khám" value={appt.reason} />
                <InfoRow icon="note-outline" label="Ghi chú" value={appt.notes} />
                {appt.appointment_services?.length > 0 && (
                    <View style={S.services}>
                        <Text style={S.serviceTitle}>Dịch vụ / Xét nghiệm:</Text>
                        {appt.appointment_services.map((s) => (
                            <View key={s.id} style={S.serviceRow}>
                                <Text style={S.serviceName}>
                                    • {s.service_name || `Dịch vụ #${s.service}`}
                                </Text>
                                <Text style={S.servicePrice}>
                                    {Number(s.price_at_time).toLocaleString("vi-VN")}đ
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </Section>

            {payment && (
                <Section title="Thanh toán">
                    <InfoRow
                        icon="cash-multiple"
                        label="Số tiền"
                        value={`${Number(payment.amount).toLocaleString("vi-VN")}đ`}
                    />
                    <InfoRow
                        icon="credit-card-outline"
                        label="Phương thức"
                        value={PAY_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                    />
                    <InfoRow
                        icon="check-circle-outline"
                        label="Trạng thái"
                        value={PAY_STATUS_LABELS[payment.status] || payment.status}
                        valueColor={PAY_STATUS_COLORS[payment.status]}
                    />
                    {payment.paid_at && (
                        <InfoRow
                            icon="clock-check-outline"
                            label="Thời gian TT"
                            value={new Date(payment.paid_at).toLocaleString("vi-VN")}
                        />
                    )}
                </Section>
            )}

            <View style={S.actions}>
                {canConfirm && (
                    <Button
                        mode="contained"
                        icon="check-circle-outline"
                        loading={updating}
                        onPress={() => doUpdateStatus("confirmed", STATUS_LABELS.confirmed)}
                        style={[S.btn, { backgroundColor: COLORS.green }]}
                    >
                        Xác nhận lịch hẹn
                    </Button>
                )}
                {canStart && (
                    <Button
                        mode="contained"
                        icon="account-check-outline"
                        loading={updating}
                        onPress={() => doUpdateStatus("in_progress", STATUS_LABELS.in_progress)}
                        style={[S.btn, { backgroundColor: COLORS.purple }]}
                    >
                        Bệnh nhân đã check-in
                    </Button>
                )}
                {canComplete && (
                    <Button
                        mode="contained"
                        icon="check-all"
                        loading={updating}
                        onPress={() => doUpdateStatus("completed", STATUS_LABELS.completed)}
                        style={[S.btn, { backgroundColor: COLORS.primary }]}
                    >
                        Hoàn thành khám
                    </Button>
                )}
                {canCollectCash && (
                    <Button
                        mode="contained"
                        icon="cash-register"
                        onPress={() =>
                            nav.navigate("staff-collect-payment", {
                                paymentId: payment.id,
                                amount: payment.amount,
                                patientName: patient.full_name,
                                appointmentId: appt.id,
                            })
                        }
                        style={[S.btn, { backgroundColor: COLORS.orange }]}
                    >
                        Thu tiền mặt
                    </Button>
                )}
                {canNoShow && (
                    <Button
                        mode="outlined"
                        icon="account-off-outline"
                        loading={updating}
                        onPress={() => doUpdateStatus("no_show", STATUS_LABELS.no_show)}
                        style={S.btn}
                        textColor={COLORS.textMuted}
                    >
                        Bệnh nhân không đến
                    </Button>
                )}
                {canCancel && (
                    <Button
                        mode="outlined"
                        icon="close-circle-outline"
                        loading={updating}
                        onPress={() => doUpdateStatus("cancelled", STATUS_LABELS.cancelled)}
                        style={S.btn}
                        textColor={COLORS.red}
                    >
                        Hủy lịch hẹn
                    </Button>
                )}
            </View>

            <View style={{ height: 32 }} />
        </ScrollView>
    );
};
export default StaffAppointmentDetail;