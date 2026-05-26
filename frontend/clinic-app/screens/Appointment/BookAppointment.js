import { View, ScrollView, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useState, useContext, useEffect, useRef } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const HOLD_MINUTES = 10;

const DoctorAvatar = ({ uri, size = 52 }) => {
    const [err, setErr] = useState(false);
    if (uri && !err) return (
        <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            onError={() => setErr(true)}
        />
    );
    return (
        <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: COLORS.primaryPale,
            alignItems: "center", justifyContent: "center",
        }}>
            <MaterialCommunityIcons name="doctor" size={size * 0.52} color={COLORS.primary} />
        </View>
    );
};

const BookAppointment = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { doctorId, scheduleId, doctorName, schedule } = route.params || {};

    const doctorAvatar = schedule?.doctorAvatar || route.params?.doctorAvatar || null;

    const [form, setForm] = useState({
        reason: "",
        notes: "",
        appointment_date: schedule ? `${schedule.date}T${schedule.start_time}` : "",
    });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    // 10-minute countdown
    const startTime = useRef(Date.now());
    const [secondsLeft, setSecondsLeft] = useState(HOLD_MINUTES * 60);
    const expired = secondsLeft <= 0;

    useEffect(() => {
        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
            const left = HOLD_MINUTES * 60 - elapsed;
            setSecondsLeft(left > 0 ? left : 0);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatCountdown = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, "0")}`;
    };

    const validate = () => {
        if (!doctorId) { setErr("Vui lòng chọn bác sĩ trước khi đặt lịch!"); return false; }
        if (!form.appointment_date) { setErr("Vui lòng nhập ngày giờ khám!"); return false; }
        if (!form.reason.trim()) { setErr("Vui lòng nhập lý do khám!"); return false; }
        if (expired) { setErr("Phiên đặt lịch đã hết hạn. Vui lòng chọn lại ca khám."); return false; }
        return true;
    };

    const book = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            setErr(null);
            const payload = {
                doctor: doctorId,
                appointment_date: form.appointment_date,
                reason: form.reason,
                notes: form.notes,
            };
            if (scheduleId) payload.schedule = scheduleId;

            const res = await authApis(user.token).post(endpoints["appointments"], payload);

            if (res.status === 201) {
                const appt = res.data;
                nav.navigate("payment-screen", {
                    invoiceId: appt.invoice?.id,
                    appointmentId: appt.id,
                    doctorName,
                    appointmentDate: appt.appointment_date,
                    amount: appt.invoice?.total_amount_amount ?? appt.invoice?.remaining ?? 0,
                    fromBooking: true,
                });
            }
        } catch (ex) {
            console.error(ex);
            const detail = ex?.response?.data;
            let msg = "Đặt lịch thất bại. Vui lòng thử lại!";
            if (detail) {
                if (typeof detail === "string") msg = detail;
                else if (detail.detail) msg = detail.detail;
                else msg = Object.entries(detail)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                    .join("\n");
            }
            setErr(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={Styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={[Styles.padding, styles.form]}>

                {/* Doctor info */}
                <View style={styles.doctorCard}>
                    <DoctorAvatar uri={doctorAvatar} size={54} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.doctorName}>BS. {doctorName}</Text>
                        {schedule && (
                            <>
                                <View style={styles.infoLine}>
                                    <MaterialCommunityIcons name="calendar" size={13} color={COLORS.primary} />
                                    <Text style={styles.infoText}>
                                        {" "}{new Date(schedule.date + "T00:00:00").toLocaleDateString("vi-VN", {
                                            weekday: "short", day: "numeric", month: "numeric", year: "numeric"
                                        })}
                                    </Text>
                                </View>
                                <View style={styles.infoLine}>
                                    <MaterialCommunityIcons name="clock-outline" size={13} color={COLORS.primary} />
                                    <Text style={styles.infoText}>
                                        {" "}{schedule.start_time} – {schedule.end_time}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Countdown */}
                <View style={[styles.countdown, expired && styles.countdownExpired]}>
                    <MaterialCommunityIcons
                        name={expired ? "clock-alert-outline" : "timer-sand"}
                        size={18}
                        color={expired ? COLORS.red : secondsLeft < 120 ? COLORS.orange : COLORS.primary}
                    />
                    <Text style={[
                        styles.countdownText,
                        expired && { color: COLORS.red },
                        !expired && secondsLeft < 120 && { color: COLORS.orange },
                    ]}>
                        {expired
                            ? " Phiên đặt lịch đã hết hạn"
                            : ` Giữ chỗ còn lại: ${formatCountdown(secondsLeft)}`}
                    </Text>
                </View>

                <HelperText type="error" visible={!!err}>{err}</HelperText>

                {!schedule && (
                    <TextInput
                        label="Ngày giờ hẹn (YYYY-MM-DDTHH:MM)"
                        value={form.appointment_date}
                        onChangeText={(t) => setForm({ ...form, appointment_date: t })}
                        style={Styles.margin}
                        mode="outlined"
                        left={<TextInput.Icon icon="calendar" />}
                        outlineColor={COLORS.primary}
                        activeOutlineColor={COLORS.primary}
                        placeholder="2025-06-15T09:00"
                    />
                )}

                <TextInput
                    label="Lý do khám *"
                    value={form.reason}
                    onChangeText={(t) => setForm({ ...form, reason: t })}
                    style={Styles.margin}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    left={<TextInput.Icon icon="stethoscope" />}
                    outlineColor={COLORS.primary}
                    activeOutlineColor={COLORS.primary}
                    placeholder="Mô tả triệu chứng hoặc lý do khám..."
                />

                <TextInput
                    label="Ghi chú thêm"
                    value={form.notes}
                    onChangeText={(t) => setForm({ ...form, notes: t })}
                    style={Styles.margin}
                    mode="outlined"
                    multiline
                    numberOfLines={2}
                    left={<TextInput.Icon icon="note-text-outline" />}
                    outlineColor={COLORS.primary}
                    activeOutlineColor={COLORS.primary}
                    placeholder="Dị ứng thuốc, tiền sử bệnh..."
                />

                <TouchableOpacity
                    style={[styles.confirmBtn, (loading || expired) && { opacity: 0.55 }]}
                    onPress={book}
                    disabled={loading || expired}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
                    <Text style={styles.confirmBtnText}>
                        {loading ? "Đang đặt lịch..." : "Xác nhận đặt lịch"}
                    </Text>
                </TouchableOpacity>

                <Button
                    mode="outlined"
                    onPress={() => nav.goBack()}
                    style={{ borderRadius: 10 }}
                    textColor={COLORS.primary}
                >
                    Quay lại
                </Button>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    form: {
        backgroundColor: "#fff",
        margin: 16,
        borderRadius: 16,
        elevation: 3,
        padding: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    doctorCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primaryPale,
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
    },
    doctorName: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.primaryDark,
        marginBottom: 4,
    },
    infoLine: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    infoText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: "600",
    },
    countdown: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primaryPale,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.primaryMid,
    },
    countdownExpired: {
        backgroundColor: COLORS.redPale,
        borderColor: COLORS.redLight,
    },
    countdownText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.primary,
    },
    confirmBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 10,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    confirmBtnText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 15,
    },
});

export default BookAppointment;
