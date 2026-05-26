import {
    View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

    const [data,       setData]       = useState(null);
    const [loading,    setLoading]    = useState(true);
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
            <View style={[Styles.header, { backgroundColor: COLORS.primaryDark }]}>
                <View style={{ flex: 1 }}>
                    <Text style={Styles.headerTitle}>
                        Xin chào, BS. {docInfo.full_name || user?.first_name || "Bác sĩ"} 👨‍⚕️
                    </Text>
                    <Text style={Styles.headerSubtitle}>{today}</Text>
                    {docInfo.specialty && (
                        <Text style={[Styles.headerSubtitle, { marginTop: 2 }]}>
                            🏥 Chuyên khoa {docInfo.specialty}
                        </Text>
                    )}
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

export default DoctorDashboard;
