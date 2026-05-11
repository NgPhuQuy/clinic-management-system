import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Text, Button } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles from "../../styles/Styles";

const STATUS_COLORS = { pending: "#ff9800", confirmed: "#4caf50", cancelled: "#f44336", completed: "#2196f3", no_show: "#9e9e9e" };
const STATUS_LABELS = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã hủy", completed: "Hoàn thành", no_show: "Không đến" };

const AppointmentDetail = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { id } = route.params;

    const [appt, setAppt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await authApis(user.token).get(endpoints["appointment-detail"](id));
                setAppt(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

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
                        alert("Đã hủy lịch hẹn.");
                    } catch (e) {
                        console.error(e);
                        alert("Không thể hủy. Vui lòng thử lại!");
                    } finally {
                        setCancelling(false);
                    }
                },
            },
        ]);
    };

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color="#1565c0" /></View>;
    if (!appt) return <View style={[Styles.center, { flex: 1 }]}><Text>Không tìm thấy lịch hẹn</Text></View>;

    return (
        <ScrollView style={Styles.container}>
            <View style={[styles.statusBanner, { backgroundColor: STATUS_COLORS[appt.status] || "#9e9e9e" }]}>
                <Text style={styles.statusText}>{STATUS_LABELS[appt.status] || appt.status}</Text>
            </View>

            <View style={Styles.padding}>
                <View style={Styles.card}>
                    <Text style={Styles.sectionHeader}>Thông tin lịch hẹn</Text>
                    <Text style={Styles.text}>👨‍⚕️ Bác sĩ: BS. {appt.doctor_name || appt.doctor}</Text>
                    <Text style={[Styles.text, { marginTop: 6 }]}>📅 Ngày giờ: {new Date(appt.appointment_date).toLocaleString("vi-VN")}</Text>
                    {appt.reason ? <Text style={[Styles.text, { marginTop: 6 }]}>📝 Lý do: {appt.reason}</Text> : null}
                    {appt.notes ? <Text style={[Styles.text, { marginTop: 6 }]}>📌 Ghi chú: {appt.notes}</Text> : null}
                    <Text style={[Styles.textSmall, { marginTop: 8 }]}>Đặt lúc: {new Date(appt.created_at).toLocaleString("vi-VN")}</Text>
                </View>

                {/* Services in appointment */}
                {appt.appointment_services && appt.appointment_services.length > 0 && (
                    <View style={Styles.card}>
                        <Text style={Styles.sectionHeader}>Dịch vụ đã sử dụng</Text>
                        {appt.appointment_services.map((s, idx) => (
                            <View key={idx} style={[Styles.row, { justifyContent: "space-between", marginBottom: 6 }]}>
                                <Text style={Styles.text}>{s.service_name || s.service}</Text>
                                <Text style={[Styles.text, { color: "#1565c0", fontWeight: "600" }]}>
                                    {Number(s.price_at_time).toLocaleString("vi-VN")}đ
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Medical record link */}
                {appt.medical_record_id && (
                    <Button
                        mode="outlined"
                        icon="clipboard-medical"
                        onPress={() => nav.navigate("medical-record-detail", { id: appt.medical_record_id })}
                        style={{ borderRadius: 8, marginBottom: 12 }}
                        textColor="#1565c0"
                    >
                        Xem hồ sơ bệnh án
                    </Button>
                )}

                {/* Cancel button - only for pending/confirmed */}
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
});

export default AppointmentDetail;
