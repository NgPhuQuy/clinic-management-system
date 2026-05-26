/**
 * screens/Staff/StaffDashboard.js
 * Dashboard chính cho nhân viên y tế – gọi backend, fallback mock nếu lỗi
 */
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
    appointments: { today: 12, pending: 4, confirmed: 6, in_progress: 2 },
    payments: {
        revenue_today: 4_850_000,
        revenue_month: 87_600_000,
        pending_cash: 3,
    },
    inventory:    { alerts: 5, low_stock: 8 },
    prescriptions: { pending: 6, dispensed_today: 14 },
    todays_appointments: [
        {
            id: 1,
            appointment_date: new Date(Date.now() + 0.5*3600*1000).toISOString(),
            patient_info: { full_name: "Nguyễn Thị Mai" },
            doctor_info:  { full_name: "Nguyễn Văn An", specialty_name: "Tim mạch" },
            status: "confirmed",
        },
        {
            id: 2,
            appointment_date: new Date(Date.now() + 1.5*3600*1000).toISOString(),
            patient_info: { full_name: "Trần Văn Bảo" },
            doctor_info:  { full_name: "Lê Minh Cường", specialty_name: "Nội tiêu hóa" },
            status: "pending",
        },
        {
            id: 3,
            appointment_date: new Date(Date.now() + 2*3600*1000).toISOString(),
            patient_info: { full_name: "Phạm Thị Dung" },
            doctor_info:  { full_name: "Phạm Thị Dung", specialty_name: "Thần kinh" },
            status: "in_progress",
        },
        {
            id: 4,
            appointment_date: new Date(Date.now() + 3*3600*1000).toISOString(),
            patient_info: { full_name: "Hoàng Thị Em" },
            doctor_info:  { full_name: "Vũ Thị Phương", specialty_name: "Nhi khoa" },
            status: "confirmed",
        },
        {
            id: 5,
            appointment_date: new Date(Date.now() + 4*3600*1000).toISOString(),
            patient_info: { full_name: "Lê Thị Cúc" },
            doctor_info:  { full_name: "Hoàng Văn Em", specialty_name: "Da liễu" },
            status: "pending",
        },
    ],
};

// ── Sub-components ────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, badge, onPress }) => (
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
        {badge && (
            <View style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: color, alignItems: "center", justifyContent: "center",
            }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>{badge}</Text>
            </View>
        )}
    </TouchableOpacity>
);

const AppointmentItem = ({ item, onPress }) => {
    const date    = new Date(item.appointment_date);
    const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const sCfg    = STATUS_CONFIG[item.status] || {};
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
                    BS. {item.doctor_info?.full_name || "–"} · {item.doctor_info?.specialty_name || ""}
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
const StaffDashboard = () => {
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
            const res = await authApis(user.token).get(endpoints["staff-dashboard"]);
            setData(res.data);
        } catch (e) {
            console.warn("StaffDashboard: dùng mock data –", e?.response?.status || e.message);
            setData(MOCK_DASHBOARD);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) return (
        <View style={Styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
    );

    const appts        = data?.appointments   || {};
    const payments     = data?.payments       || {};
    const inventory    = data?.inventory      || {};
    const prescriptions= data?.prescriptions  || {};
    const todayAppts   = data?.todays_appointments || [];

    return (
        <ScrollView
            style={Styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); load(); }}
                    tintColor={COLORS.teal}
                />
            }
        >
            <StatusBar backgroundColor={COLORS.teal} barStyle="light-content" />

            {/* Header */}
            <View style={[Styles.header, { backgroundColor: COLORS.teal }]}>
                <View style={{ flex: 1 }}>
                    <Text style={Styles.headerTitle}>
                        Nhân viên y tế 🏥
                    </Text>
                    <Text style={Styles.headerSubtitle}>{today}</Text>
                    <Text style={Styles.headerSubtitle}>
                        Xin chào, {user?.first_name || "bạn"}!
                    </Text>
                </View>
                <TouchableOpacity style={Styles.notifBtn} onPress={() => nav.navigate("notifications")}>
                    <MaterialCommunityIcons name="bell-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Revenue Cards */}
            <View style={Styles.revenueRow}>
                <View style={[Styles.revenueCard, { backgroundColor: COLORS.primary }]}>
                    <MaterialCommunityIcons name="cash" size={20} color="rgba(255,255,255,0.8)" />
                    <Text style={Styles.revenueLabel}>Doanh thu hôm nay</Text>
                    <Text style={Styles.revenueValue}>
                        {Number(payments.revenue_today || 0).toLocaleString("vi-VN")}đ
                    </Text>
                </View>
                <View style={[Styles.revenueCard, { backgroundColor: COLORS.teal }]}>
                    <MaterialCommunityIcons name="chart-bar" size={20} color="rgba(255,255,255,0.8)" />
                    <Text style={Styles.revenueLabel}>Doanh thu tháng này</Text>
                    <Text style={Styles.revenueValue}>
                        {Number(payments.revenue_month || 0).toLocaleString("vi-VN")}đ
                    </Text>
                </View>
            </View>

            {/* Stats */}
            <View style={Styles.section}>
                <Text style={Styles.sectionTitle}>Công việc cần xử lý</Text>
                <View style={{ gap: 10 }}>
                    <StatCard
                        icon="calendar-clock"
                        label="Lịch hẹn hôm nay"
                        value={appts.today ?? 0}
                        color={COLORS.primary}
                        onPress={() => nav.navigate("staff-appointments")}
                    />
                    <StatCard
                        icon="clock-alert-outline"
                        label="Lịch hẹn chờ xác nhận"
                        value={appts.pending ?? 0}
                        color={COLORS.orange}
                        badge={appts.pending > 0 ? "!" : null}
                        onPress={() => nav.navigate("staff-appointments", { status: "pending" })}
                    />
                    <StatCard
                        icon="pill"
                        label="Đơn thuốc chờ cấp phát"
                        value={prescriptions.pending ?? 0}
                        color={COLORS.green}
                        badge={prescriptions.pending > 0 ? "!" : null}
                        onPress={() => nav.navigate("staff-prescriptions")}
                    />
                    <StatCard
                        icon="cash-multiple"
                        label="Thanh toán tiền mặt chờ"
                        value={payments.pending_cash ?? 0}
                        color={COLORS.orange}
                        onPress={() => nav.navigate("staff-payments")}
                    />
                    <StatCard
                        icon="alert-circle-outline"
                        label="Cảnh báo kho thuốc"
                        value={inventory.alerts ?? 0}
                        color={COLORS.red}
                        badge={inventory.alerts > 0 ? "!" : null}
                        onPress={() => nav.navigate("staff-inventory")}
                    />
                    <StatCard
                        icon="package-variant-closed"
                        label="Thuốc sắp hết hàng"
                        value={inventory.low_stock ?? 0}
                        color={COLORS.orange}
                        onPress={() => nav.navigate("staff-inventory")}
                    />
                </View>
            </View>

            {/* Quick Actions */}
            <View style={Styles.section}>
                <Text style={Styles.sectionTitle}>Chức năng nhanh</Text>
                <View style={Styles.actionsGrid}>
                    {[
                        { icon: "calendar-check",   label: "Quản lý\nlịch hẹn",    screen: "staff-appointments",   color: COLORS.primary },
                        { icon: "pill",              label: "Cấp phát\nthuốc",       screen: "staff-prescriptions",  color: COLORS.green },
                        { icon: "cash-register",     label: "Thu tiền\nthanh toán",  screen: "staff-payments",       color: COLORS.orange },
                        { icon: "medical-bag",       label: "Tìm bệnh\nnhân",        screen: "staff-find-patient",   color: COLORS.teal },
                        { icon: "package-variant",   label: "Quản lý\nkho thuốc",   screen: "staff-inventory",      color: COLORS.purple },
                        { icon: "account-details",   label: "Hồ sơ\ncá nhân",       screen: "staff-profile",        color: COLORS.textMuted },
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

            {/* Today's Appointments */}
            {todayAppts.length > 0 && (
                <View style={Styles.section}>
                    <View style={Styles.sectionRow}>
                        <Text style={Styles.sectionTitle}>Lịch hẹn hôm nay</Text>
                        <TouchableOpacity onPress={() => nav.navigate("staff-appointments")}>
                            <Text style={Styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    {todayAppts.map(item => (
                        <AppointmentItem
                            key={item.id}
                            item={item}
                            onPress={() => nav.navigate("staff-appointment-detail", { id: item.id })}
                        />
                    ))}
                </View>
            )}

            <View style={{ height: 24 }} />
        </ScrollView>
    );
};

export default StaffDashboard;
