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
import { staffDashboardStyles as styles } from "./Styles";


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

const StaffDashboard = () => {
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
            const res = await authApis(user.token).get(endpoints["staff-dashboard"]);
            setData(res.data);
        } catch (e) {
            console.warn("StaffDashboard lỗi:", e?.response?.status || e.message);
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

    const appts         = data?.appointments  || {};
    const inventory     = data?.inventory    || {};
    const prescriptions = data?.prescriptions || {};
    const todayAppts    = data?.todays_appointments || [];

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

            <View style={[styles.header, { paddingTop: top + 16 }]}>
                <View>
                    <Text style={styles.greeting}>
                        Xin chào, {[user?.last_name, user?.first_name].filter(Boolean).join(" ") || user?.username}!
                    </Text>
                    <Text style={styles.dateText}>{today}</Text>
                </View>
                <TouchableOpacity style={Styles.notifBtn} onPress={() => nav.navigate("notifications")}>
                    <MaterialCommunityIcons name="bell-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

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
                        icon="alert-circle-outline"
                        label="Cảnh báo kho thuốc"
                        value={inventory.alerts ?? 0}
                        color={COLORS.red}
                        badge={inventory.alerts > 0 ? "!" : null}
                        onPress={() => nav.navigate("staff-inventory", { tab: "alerts" })}
                    />
                    <StatCard
                        icon="package-variant-closed"
                        label="Thuốc sắp hết hàng"
                        value={inventory.low_stock ?? 0}
                        color={COLORS.orange}
                        badge={inventory.low_stock > 0 ? "!" : null}
                        onPress={() => nav.navigate("staff-inventory", { tab: "low_stock" })}
                    />
                    <StatCard
                        icon="calendar-alert"
                        label="Lô thuốc sắp hết hạn"
                        value={inventory.near_expiry ?? 0}
                        color={COLORS.purple}
                        badge={inventory.near_expiry > 0 ? "!" : null}
                        onPress={() => nav.navigate("staff-inventory", { tab: "near_expiry" })}
                    />
                </View>
            </View>

            <View style={Styles.section}>
                <Text style={Styles.sectionTitle}>Chức năng nhanh</Text>
                <View style={Styles.actionsGrid}>
                    {[
                        { icon: "calendar-check",      label: "Quản lý\nlịch hẹn",  screen: "staff-appointments",  color: COLORS.primary },
                        { icon: "pill",                 label: "Cấp phát\nthuốc",    screen: "staff-prescriptions", color: COLORS.green },
                        { icon: "account-search",       label: "Tìm bệnh\nnhân",     screen: "staff-find-patient",  color: COLORS.teal },
                        { icon: "package-variant",      label: "Quản lý\nkho thuốc", screen: "staff-inventory",     color: COLORS.purple },
                        { icon: "credit-card-outline",  label: "Lịch sử\nthanh toán",screen: "staff-payments",      color: COLORS.orange },
                        { icon: "account-circle-outline",label: "Hồ sơ\ncá nhân",   screen: "staff-profile",       color: COLORS.textMuted },
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
