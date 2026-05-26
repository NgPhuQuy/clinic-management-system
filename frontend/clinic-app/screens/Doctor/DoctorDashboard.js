import {
    View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, STATUS_CONFIG } from "../../styles/Styles";

// ── Mock data khi backend chưa sẵn sàng ──────────────────────────────────────
const MOCK_DASHBOARD = {
    appointments: { today: 8, pending: 3, in_progress: 1, this_month: 47 },
    upcoming_appointments: [
        {
            id: 1,
            appointment_date: new Date(Date.now() + 1.5*3600*1000).toISOString(),
            patient_info: { full_name: "Nguyễn Thị Mai" },
            reason: "Đau ngực, khó thở khi gắng sức",
            status: "confirmed",
        },
        {
            id: 2,
            appointment_date: new Date(Date.now() + 3*3600*1000).toISOString(),
            patient_info: { full_name: "Trần Văn Bảo" },
            reason: "Kiểm tra sức khỏe định kỳ",
            status: "pending",
        },
        {
            id: 3,
            appointment_date: new Date(Date.now() + 5*3600*1000).toISOString(),
            patient_info: { full_name: "Lê Thị Cúc" },
            reason: "Tim đập nhanh, hồi hộp, mệt mỏi",
            status: "confirmed",
        },
        {
            id: 4,
            appointment_date: new Date(Date.now() + 7*3600*1000).toISOString(),
            patient_info: { full_name: "Phạm Minh Đức" },
            reason: "Tăng huyết áp không kiểm soát",
            status: "pending",
        },
    ],
    doctor_info: {
        full_name: "Nguyễn Văn An",
        specialty: "Tim mạch",
        total_patients: 312,
        rating: 4.8,
    },
};

// ── Sub-components ────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, onPress }) => (
    <TouchableOpacity
        style={[Styles.statCard, { borderLeftColor: color }]}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <View style={[Styles.statIcon, { backgroundColor: color + "20" }]}>
            <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={Styles.statValue}>{value}</Text>
            <Text style={Styles.statLabel}>{label}</Text>
        </View>
    </TouchableOpacity>
);

const AppointmentItem = ({ item, onPress }) => {
    const apptDate = new Date(item.appointment_date);
    const timeStr  = apptDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const sCfg     = STATUS_CONFIG[item.status] || {};
    return (
        <TouchableOpacity style={Styles.apptItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[Styles.timeBox, { backgroundColor: COLORS.primaryPale }]}>
                <Text style={Styles.timeText}>{timeStr}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={Styles.apptPatient} numberOfLines={1}>
                    {item.patient_info?.full_name || `BN #${item.patient}`}
                </Text>
                <Text style={Styles.apptSub} numberOfLines={1}>
                    {item.reason || "Khám tổng quát"}
                </Text>
            </View>
            <View style={[Styles.statusBadge, { backgroundColor: (sCfg.color || COLORS.primary) + "20" }]}>
                <Text style={[Styles.statusText, { color: sCfg.color || COLORS.primary }]}>
                    {sCfg.label}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

// ── Main screen ───────────────────────────────────────────────────────────────
const DoctorDashboard = () => {
    const nav  = useNavigation();
    const user = useContext(MyUserContext);
    const { top } = useSafeAreaInsets();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const today = new Date().toLocaleDateString("vi-VN", {
        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    });

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["doctor-dashboard"]);
            setData(res.data);
        } catch (e) {
            console.warn("DoctorDashboard: dùng mock data –", e?.response?.status || e.message);
            setData(MOCK_DASHBOARD);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) return (
        <View style={Styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

    const appts    = data?.appointments || {};
    const upcoming = data?.upcoming_appointments || [];
    const docInfo  = data?.doctor_info || {};

    return (
        <ScrollView
            style={Styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); load(); }}
                    tintColor={COLORS.primary}
                />
            }
        >
            <StatusBar backgroundColor={COLORS.primaryDark} barStyle="light-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: top + 16 }]}>
                <View>
                    <Text style={styles.greeting}>Xin chào, Bác sĩ! 👨‍⚕️</Text>
                    <Text style={styles.dateText}>{today}</Text>
                </View>
                <TouchableOpacity style={Styles.notifBtn} onPress={() => nav.navigate("notifications")}>
                    <MaterialCommunityIcons name="bell-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Info strip */}
            {(docInfo.total_patients || docInfo.rating) ? (
                <View style={{ flexDirection: "row", margin: 16, marginBottom: 0, gap: 10 }}>
                    <View style={[Styles.revenueCard, { backgroundColor: COLORS.primary }]}>
                        <MaterialCommunityIcons name="account-group" size={18} color="rgba(255,255,255,0.8)" />
                        <Text style={Styles.revenueLabel}>Tổng bệnh nhân</Text>
                        <Text style={Styles.revenueValue}>{docInfo.total_patients ?? 0}</Text>
                    </View>
                    <View style={[Styles.revenueCard, { backgroundColor: COLORS.orange }]}>
                        <MaterialCommunityIcons name="star-outline" size={18} color="rgba(255,255,255,0.8)" />
                        <Text style={Styles.revenueLabel}>Đánh giá trung bình</Text>
                        <Text style={Styles.revenueValue}>⭐ {docInfo.rating ?? "–"}/5</Text>
                    </View>
                </View>
            ) : null}

            {/* Quick Stats */}
            <View style={Styles.section}>
                <Text style={Styles.sectionTitle}>Tổng quan hôm nay</Text>
                <View style={{ gap: 10 }}>
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
            <View style={Styles.section}>
                <Text style={Styles.sectionTitle}>Chức năng nhanh</Text>
                <View style={Styles.actionsGrid}>
                    {[
                        { icon: "calendar-clock",       label: "Lịch hẹn",       screen: "doctor-appointments",    color: COLORS.primary },
                        { icon: "file-document-outline", label: "Hồ sơ bệnh án", screen: "doctor-medical-records", color: COLORS.green },
                        { icon: "pill",                  label: "Kê đơn thuốc",  screen: "doctor-prescriptions",   color: COLORS.orange },
                        { icon: "calendar-edit",         label: "Ca trực",        screen: "doctor-schedules",       color: COLORS.teal },
                        { icon: "video-outline",         label: "Tư vấn online", screen: "doctor-consultations",   color: COLORS.purple },
                        { icon: "account-details",       label: "Hồ sơ cá nhân", screen: "doctor-profile",         color: COLORS.textMuted },
                    ].map(item => (
                        <TouchableOpacity
                            key={item.screen}
                            style={Styles.actionBtn}
                            onPress={() => nav.navigate(item.screen)}
                            activeOpacity={0.8}
                        >
                            <View style={[Styles.actionIcon, { backgroundColor: item.color + "20" }]}>
                                <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                            </View>
                            <Text style={Styles.actionLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Upcoming Appointments */}
            {upcoming.length > 0 && (
                <View style={Styles.section}>
                    <View style={Styles.sectionRow}>
                        <Text style={Styles.sectionTitle}>Lịch hẹn sắp tới</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-appointments")}>
                            <Text style={Styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    {upcoming.map(item => (
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
        paddingTop: 16,
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
