/**
 * screens/Doctor/DoctorAppointments.js
 * Bác sĩ quản lý lịch hẹn: xem, xác nhận, bắt đầu khám, hoàn thành
 */
import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { Text, Chip, Searchbar } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const STATUS_CONFIG = {
    all: { label: "Tất cả", color: COLORS.textMuted },
    pending: { label: "Chờ xác nhận", color: COLORS.orange },
    confirmed: { label: "Đã xác nhận", color: COLORS.green },
    in_progress: { label: "Đang khám", color: COLORS.purple },
    completed: { label: "Hoàn thành", color: COLORS.primary },
    cancelled: { label: "Đã hủy", color: COLORS.red },
    no_show: { label: "Không đến", color: COLORS.textLight },
};

// Bác sĩ được phép chuyển trạng thái theo workflow
const DOCTOR_TRANSITIONS = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["in_progress", "no_show"],
    in_progress: ["completed"],
};

const AppointmentCard = ({ item, onUpdateStatus, onPress }) => {
    const date = new Date(item.appointment_date);
    const dateStr = date.toLocaleDateString("vi-VN");
    const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const statusCfg = STATUS_CONFIG[item.status] || {};
    const transitions = DOCTOR_TRANSITIONS[item.status] || [];

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.patientName} numberOfLines={1}>
                        {item.patient_info?.full_name || `Bệnh nhân #${item.patient}`}
                    </Text>
                    <Text style={styles.subInfo}>
                        {dateStr} • {timeStr}
                    </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: statusCfg.color + "20" }]}>
                    <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
                        {statusCfg.label}
                    </Text>
                </View>
            </View>

            {/* Body */}
            {item.reason ? (
                <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>
            ) : null}

            {/* Actions: nút chuyển trạng thái */}
            {transitions.length > 0 && (
                <View style={styles.actions}>
                    {transitions.map((nextStatus) => {
                        const cfg = STATUS_CONFIG[nextStatus];
                        const icons = {
                            confirmed: "check-circle-outline",
                            in_progress: "stethoscope",
                            completed: "check-all",
                            cancelled: "close-circle-outline",
                            no_show: "account-off-outline",
                        };
                        return (
                            <TouchableOpacity
                                key={nextStatus}
                                style={[styles.actionBtn, { borderColor: cfg.color }]}
                                onPress={() => onUpdateStatus(item.id, nextStatus)}
                            >
                                <MaterialCommunityIcons name={icons[nextStatus]} size={14} color={cfg.color} />
                                <Text style={[styles.actionLabel, { color: cfg.color }]}>{cfg.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    {/* Nút Ghi hồ sơ nếu đang khám */}
                    {item.status === "in_progress" && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: COLORS.primary, backgroundColor: COLORS.primaryPale }]}
                            onPress={onPress}
                        >
                            <MaterialCommunityIcons name="file-edit-outline" size={14} color={COLORS.primary} />
                            <Text style={[styles.actionLabel, { color: COLORS.primary }]}>Ghi hồ sơ</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const DoctorAppointments = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState(route.params?.status || "all");
    const [search, setSearch] = useState("");

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

    const updateStatus = (id, newStatus) => {
        const statusCfg = STATUS_CONFIG[newStatus];
        Alert.alert(
            "Xác nhận",
            `Chuyển trạng thái sang "${statusCfg.label}"?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xác nhận",
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
                            const msg = e?.response?.data?.status?.[0] || e?.response?.data?.detail || "Lỗi cập nhật!";
                            Alert.alert("Lỗi", msg);
                        }
                    },
                },
            ]
        );
    };

    const filtered = appointments.filter((a) => {
        if (!search) return true;
        const name = (a.patient_info?.full_name || "").toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const renderItem = ({ item }) => (
        <AppointmentCard
            item={item}
            onUpdateStatus={updateStatus}
            onPress={() => nav.navigate("doctor-appointment-detail", { id: item.id })}
        />
    );

    return (
        <View style={styles.container}>
            {/* Search */}
            <View style={styles.searchBar}>
                <Searchbar
                    placeholder="Tìm bệnh nhân..."
                    value={search}
                    onChangeText={setSearch}
                    style={styles.searchInput}
                    iconColor={COLORS.primary}
                />
            </View>

            {/* Filter tabs */}
            <View style={styles.filters}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={Object.entries(STATUS_CONFIG)}
                    keyExtractor={([k]) => k}
                    renderItem={({ item: [key, cfg] }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                activeFilter === key && { backgroundColor: cfg.color, borderColor: cfg.color },
                            ]}
                            onPress={() => setActiveFilter(key)}
                        >
                            <Text style={[
                                styles.filterText,
                                activeFilter === key && { color: "#fff" },
                            ]}>
                                {cfg.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
                />
            </View>

            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
                    }
                    ListEmptyComponent={
                        <View style={[Styles.center, { flex: 1, marginTop: 60 }]}>
                            <MaterialCommunityIcons name="calendar-blank" size={48} color={COLORS.border} />
                            <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Không có lịch hẹn nào</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    searchBar: { backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    searchInput: { backgroundColor: COLORS.bg, elevation: 0, height: 44 },
    filters: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: COLORS.border, backgroundColor: "#fff",
    },
    filterText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    subInfo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusLabel: { fontSize: 11, fontWeight: "700" },
    reason: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    actionBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 8, borderWidth: 1.5, backgroundColor: "#fff",
    },
    actionLabel: { fontSize: 11, fontWeight: "700" },
});

export default DoctorAppointments;