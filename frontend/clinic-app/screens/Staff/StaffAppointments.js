/**
 * screens/Staff/StaffAppointments.js
 * Nhân viên y tế quản lý lịch hẹn:
 *   - Xem toàn bộ lịch hẹn (lọc theo status, ngày)
 *   - Xác nhận / Hủy / Đánh dấu không đến
 */
import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { Text, Searchbar } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const STATUS_CONFIG = {
    all:         { label: "Tất cả",        color: COLORS.textMuted },
    pending:     { label: "Chờ xác nhận",  color: COLORS.orange },
    confirmed:   { label: "Đã xác nhận",   color: COLORS.green },
    in_progress: { label: "Đang khám",     color: COLORS.purple },
    completed:   { label: "Hoàn thành",    color: COLORS.primary },
    cancelled:   { label: "Đã hủy",        color: COLORS.red },
    no_show:     { label: "Không đến",     color: COLORS.textLight },
};

// Staff được phép làm gì với từng trạng thái
const STAFF_TRANSITIONS = {
    pending:     ["confirmed", "cancelled", "no_show"],
    confirmed:   ["in_progress", "cancelled", "no_show"],
    in_progress: ["completed", "cancelled"],
};

const TRANSITION_ICONS = {
    confirmed:   "check-circle-outline",
    in_progress: "account-check-outline",
    completed:   "check-all",
    cancelled:   "close-circle-outline",
    no_show:     "account-off-outline",
};

const AppointmentCard = ({ item, onUpdateStatus, onPress }) => {
    const date    = new Date(item.appointment_date);
    const dateStr = date.toLocaleDateString("vi-VN");
    const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const sCfg    = STATUS_CONFIG[item.status] || {};
    const transitions = STAFF_TRANSITIONS[item.status] || [];

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            {/* Header row */}
            <View style={styles.cardTop}>
                <View style={[styles.statusDot, { backgroundColor: sCfg.color }]} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.patientName} numberOfLines={1}>
                        {item.patient_info?.full_name || `Bệnh nhân #${item.patient}`}
                    </Text>
                    <Text style={styles.subInfo}>
                        BS. {item.doctor_info?.full_name || `#${item.doctor}`}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sCfg.color + "20" }]}>
                    <Text style={[styles.statusText, { color: sCfg.color }]}>{sCfg.label}</Text>
                </View>
            </View>

            {/* Date & specialty */}
            <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-clock" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>{dateStr} lúc {timeStr}</Text>
                {item.doctor_info?.specialty_name && (
                    <>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.infoText}>{item.doctor_info.specialty_name}</Text>
                    </>
                )}
            </View>

            {item.reason ? (
                <Text style={styles.reason} numberOfLines={1}>
                    📋 {item.reason}
                </Text>
            ) : null}

            {/* Action buttons */}
            {transitions.length > 0 && (
                <View style={styles.actions}>
                    {transitions.map((next) => {
                        const cfg = STATUS_CONFIG[next];
                        return (
                            <TouchableOpacity
                                key={next}
                                style={[styles.actionBtn, { borderColor: cfg.color }]}
                                onPress={() => onUpdateStatus(item.id, next, item)}
                            >
                                <MaterialCommunityIcons
                                    name={TRANSITION_ICONS[next] || "arrow-right"}
                                    size={13}
                                    color={cfg.color}
                                />
                                <Text style={[styles.actionLabel, { color: cfg.color }]}>
                                    {cfg.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </TouchableOpacity>
    );
};

const StaffAppointments = () => {
    const nav    = useNavigation();
    const route  = useRoute();
    const user   = useContext(MyUserContext);

    const [appointments, setAppointments] = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [refreshing,   setRefreshing]   = useState(false);
    const [activeFilter, setActiveFilter] = useState(route.params?.status || "all");
    const [search,       setSearch]       = useState("");

    const load = async () => {
        try {
            const params = {};
            if (activeFilter !== "all") params.status = activeFilter;
            const res = await authApis(user.token).get(endpoints["appointments"], { params });
            setAppointments(res.data.results || res.data);
        } catch (e) {
            console.error(e?.response?.data || e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [activeFilter]);

    const updateStatus = (id, newStatus, item) => {
        const cfg = STATUS_CONFIG[newStatus];
        Alert.alert(
            "Xác nhận thao tác",
            `Chuyển lịch hẹn của ${item.patient_info?.full_name || "bệnh nhân"} sang "${cfg.label}"?`,
            [
                { text: "Hủy bỏ", style: "cancel" },
                {
                    text: "Xác nhận",
                    style: newStatus === "cancelled" ? "destructive" : "default",
                    onPress: async () => {
                        try {
                            await authApis(user.token).patch(
                                endpoints["appointment-status"](id),
                                { status: newStatus }
                            );
                            setAppointments((prev) =>
                                prev.map((a) => a.id === id ? { ...a, status: newStatus } : a)
                            );
                        } catch (e) {
                            const msg =
                                e?.response?.data?.status?.[0] ||
                                e?.response?.data?.detail ||
                                "Không thể cập nhật trạng thái!";
                            Alert.alert("Lỗi", msg);
                        }
                    },
                },
            ]
        );
    };

    const filtered = appointments.filter((a) => {
        const name = (a.patient_info?.full_name || "").toLowerCase();
        const doc  = (a.doctor_info?.full_name  || "").toLowerCase();
        const q    = search.toLowerCase();
        return name.includes(q) || doc.includes(q);
    });

    return (
        <View style={styles.container}>
            {/* Search */}
            <View style={styles.topBar}>
                <Searchbar
                    placeholder="Tìm bệnh nhân hoặc bác sĩ..."
                    value={search}
                    onChangeText={setSearch}
                    style={styles.searchInput}
                    iconColor={COLORS.primary}
                />
            </View>

            {/* Status filter */}
            <View style={styles.filterBar}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={Object.entries(STATUS_CONFIG)}
                    keyExtractor={([k]) => k}
                    renderItem={({ item: [key, cfg] }) => (
                        <TouchableOpacity
                            style={[
                                styles.chip,
                                activeFilter === key && {
                                    backgroundColor: cfg.color,
                                    borderColor: cfg.color,
                                },
                            ]}
                            onPress={() => setActiveFilter(key)}
                        >
                            <Text style={[
                                styles.chipText,
                                activeFilter === key && { color: "#fff" },
                            ]}>
                                {cfg.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
                />
            </View>

            {/* List */}
            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <AppointmentCard
                            item={item}
                            onUpdateStatus={updateStatus}
                            onPress={() =>
                                nav.navigate("staff-appointment-detail", { id: item.id })
                            }
                        />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(); }}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={[Styles.center, { marginTop: 60 }]}>
                            <MaterialCommunityIcons name="calendar-blank" size={52} color={COLORS.border} />
                            <Text style={styles.emptyText}>Không có lịch hẹn nào</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: COLORS.bg },
    topBar:      { backgroundColor: "#fff", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
    searchInput: { backgroundColor: COLORS.bg, elevation: 0, height: 44 },
    filterBar:   { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
    chip: {
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: COLORS.border, backgroundColor: "#fff",
    },
    chipText:  { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardTop:    { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
    statusDot:  { width: 10, height: 10, borderRadius: 5 },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    subInfo:    { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText:  { fontSize: 11, fontWeight: "700" },
    infoRow:    { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
    infoText:   { fontSize: 12, color: COLORS.textMuted },
    dot:        { fontSize: 12, color: COLORS.border },
    reason:     { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
    actions:    { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
    actionBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 8, borderWidth: 1.5, backgroundColor: "#fff",
    },
    actionLabel: { fontSize: 11, fontWeight: "700" },
    emptyText:  { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
});

export default StaffAppointments;