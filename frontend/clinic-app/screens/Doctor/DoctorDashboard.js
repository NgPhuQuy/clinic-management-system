import {
    View, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const STATUS_LABELS = {
    pending: "Chờ xác nhận", confirmed: "Đã xác nhận",
    in_progress: "Đang khám", completed: "Hoàn thành",
    cancelled: "Đã hủy", no_show: "Không đến",
};
const STATUS_COLORS = {
    pending: COLORS.orange, confirmed: COLORS.green,
    in_progress: COLORS.purple, completed: COLORS.primary,
    cancelled: COLORS.red, no_show: COLORS.textLight,
};

const StatCard = ({ icon, label, value, color, onPress }) => (
    <TouchableOpacity
        style={[styles.statCard, { borderLeftColor: color }]}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
            <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    </TouchableOpacity>
);

const AppointmentItem = ({ item, onPress }) => {
    const apptDate = new Date(item.appointment_date);
    const timeStr = apptDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    return (
        <TouchableOpacity style={styles.apptItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.timeBox, { backgroundColor: COLORS.primaryPale }]}>
                <Text style={styles.timeText}>{timeStr}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.apptPatient} numberOfLines={1}>
                    {item.patient_info?.full_name || `BN #${item.patient}`}
                </Text>
                <Text style={styles.apptReason} numberOfLines={1}>
                    {item.reason || "Khám tổng quát"}
                </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + "20" }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                    {STATUS_LABELS[item.status]}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const DoctorDashboard = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const today = new Date().toLocaleDateString("vi-VN", {
        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
    });

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["doctor-dashboard"]);
            setData(res.data);
        } catch (e) {
            console.error("DoctorDashboard load error:", e?.response?.data || e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const onRefresh = () => { setRefreshing(true); load(); };

    if (loading) return (
        <View style={[Styles.center, { flex: 1, backgroundColor: COLORS.bg }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

    const appts = data?.appointments || {};
    const upcoming = data?.upcoming_appointments || [];

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
            <StatusBar backgroundColor={COLORS.primaryDark} barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Xin chào, Bác sĩ! 👨‍⚕️</Text>
                    <Text style={styles.dateText}>{today}</Text>
                </View>
                <TouchableOpacity
                    style={styles.notifBtn}
                    onPress={() => nav.navigate("notifications")}
                >
                    <MaterialCommunityIcons name="bell-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tổng quan hôm nay</Text>
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="calendar-today"
                        label="Lịch hẹn hôm nay"
                        value={appts.today ?? 0}
                        color={COLORS.primary}
                        onPress={() => nav.navigate("doctor-today-appointments")}
                    />
                    <StatCard
                        icon="clock-outline"
                        label="Chờ xác nhận"
                        value={appts.pending ?? 0}
                        color={COLORS.orange}
                        onPress={() => nav.navigate("doctor-appointments", { status: "pending" })}
                    />
                    <StatCard
                        icon="stethoscope"
                        label="Đang khám"
                        value={appts.in_progress ?? 0}
                        color={COLORS.purple}
                        onPress={() => nav.navigate("doctor-appointments", { status: "in_progress" })}
                    />
                    <StatCard
                        icon="calendar-month"
                        label="Lịch hẹn tháng này"
                        value={appts.this_month ?? 0}
                        color={COLORS.teal}
                        onPress={() => nav.navigate("doctor-appointments")}
                    />
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chức năng nhanh</Text>
                <View style={styles.actionsGrid}>
                    {[
                        { icon: "calendar-clock", label: "Lịch hẹn của tôi", screen: "doctor-appointments", color: COLORS.primary },
                        { icon: "file-document-outline", label: "Hồ sơ bệnh án", screen: "doctor-medical-records", color: COLORS.green },
                        { icon: "pill", label: "Kê đơn thuốc", screen: "doctor-prescriptions", color: COLORS.orange },
                        { icon: "calendar-edit", label: "Lịch làm việc", screen: "doctor-schedules", color: COLORS.teal },
                        { icon: "video-outline", label: "Tư vấn trực tuyến", screen: "doctor-consultations", color: COLORS.purple },
                        { icon: "account-details", label: "Thông tin bác sĩ", screen: "doctor-profile", color: COLORS.textMuted },
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.screen}
                            style={styles.actionBtn}
                            onPress={() => nav.navigate(item.screen)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: item.color + "20" }]}>
                                <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                            </View>
                            <Text style={styles.actionLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Upcoming Appointments */}
            {upcoming.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Lịch hẹn sắp tới</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-appointments")}>
                            <Text style={styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    {upcoming.map((item) => (
                        <AppointmentItem
                            key={item.id}
                            item={item}
                            onPress={() => nav.navigate("doctor-appointment-detail", { id: item.id })}
                        />
                    ))}
                </View>
            )}

            <View style={{ height: 24 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingHorizontal: 20,
        paddingTop: 52,
        paddingBottom: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    greeting: { fontSize: 20, fontWeight: "800", color: "#fff" },
    dateText: { fontSize: 13, color: "#bbdefb", marginTop: 4 },
    notifBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center", justifyContent: "center",
    },
    section: { margin: 16, marginBottom: 0 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
    seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
    statsGrid: { gap: 10 },
    statCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        marginBottom: 2,
    },
    statIcon: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    statValue: { fontSize: 22, fontWeight: "800", color: COLORS.text },
    statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    actionsGrid: {
        flexDirection: "row", flexWrap: "wrap", gap: 10,
    },
    actionBtn: {
        width: "31%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    actionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    actionLabel: { fontSize: 11, fontWeight: "600", color: COLORS.text, textAlign: "center" },
    apptItem: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        elevation: 1,
        gap: 10,
    },
    timeBox: { padding: 8, borderRadius: 8, alignItems: "center", minWidth: 56 },
    timeText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
    apptPatient: { fontSize: 14, fontWeight: "700", color: COLORS.text },
    apptReason: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: "700" },
});

export default DoctorDashboard;