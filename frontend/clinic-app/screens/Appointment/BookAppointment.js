import { View, ScrollView, StyleSheet } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useState, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles from "../../styles/Styles";

const BookAppointment = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { doctorId, scheduleId, doctorName, schedule } = route.params || {};

    const [form, setForm] = useState({
        reason: "",
        notes: "",
        appointment_date: schedule ? `${schedule.date}T${schedule.start_time}` : "",
    });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    const validate = () => {
        if (!doctorId) { setErr("Vui lòng chọn bác sĩ trước khi đặt lịch!"); return false; }
        if (!form.appointment_date) { setErr("Vui lòng nhập ngày giờ khám!"); return false; }
        if (!form.reason) { setErr("Vui lòng nhập lý do khám!"); return false; }
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

                const invoiceId = appt.invoice?.id;
                // API trả về total_amount (từ @property Invoice.total_amount)
                const amount = appt.invoice?.total_amount ?? appt.invoice?.remaining ?? 0;
                const appointmentId = appt.id;
                const appointmentDate = appt.appointment_date;

                nav.navigate("payment-screen", {
                    invoiceId,
                    appointmentId,
                    doctorName,
                    appointmentDate,
                    amount,
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
        <ScrollView style={Styles.container}>
            <View style={[Styles.padding, styles.form]}>
                <Text style={Styles.title}>Đặt lịch hẹn</Text>

                {/* Doctor info */}
                <View style={[Styles.card, { backgroundColor: "#e3f2fd", marginBottom: 16 }]}>
                    <Text style={Styles.sectionHeader}>Thông tin bác sĩ</Text>
                    <Text style={Styles.text}>👨‍⚕️ BS. {doctorName}</Text>
                    {schedule && (
                        <>
                            <Text style={Styles.text}>📅 {new Date(schedule.date).toLocaleDateString("vi-VN")}</Text>
                            <Text style={Styles.text}>🕐 {schedule.start_time} – {schedule.end_time}</Text>
                        </>
                    )}
                </View>

                <HelperText type="error" visible={!!err}>{err}</HelperText>

                <TextInput
                    label="Ngày giờ hẹn (YYYY-MM-DDTHH:MM)"
                    value={form.appointment_date}
                    onChangeText={(t) => setForm({ ...form, appointment_date: t })}
                    style={Styles.margin}
                    mode="outlined"
                    left={<TextInput.Icon icon="calendar" />}
                    outlineColor="#1565c0"
                    activeOutlineColor="#1565c0"
                    placeholder="2025-06-15T09:00"
                />

                <TextInput
                    label="Lý do khám *"
                    value={form.reason}
                    onChangeText={(t) => setForm({ ...form, reason: t })}
                    style={Styles.margin}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    left={<TextInput.Icon icon="stethoscope" />}
                    outlineColor="#1565c0"
                    activeOutlineColor="#1565c0"
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
                    left={<TextInput.Icon icon="note-text" />}
                    outlineColor="#1565c0"
                    activeOutlineColor="#1565c0"
                    placeholder="Dị ứng thuốc, tiền sử bệnh..."
                />

                <Button
                    mode="contained"
                    onPress={book}
                    loading={loading}
                    disabled={loading}
                    buttonColor="#1565c0"
                    style={styles.btn}
                    icon="calendar-check"
                >
                    Xác nhận đặt lịch
                </Button>
                <Button mode="outlined" onPress={() => nav.goBack()} style={{ borderRadius: 8 }} textColor="#1565c0">
                    Hủy
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
    },
    btn: {
        borderRadius: 8,
        paddingVertical: 4,
        marginBottom: 10,
    },
});

export default BookAppointment;