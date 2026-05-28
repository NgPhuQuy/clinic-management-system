import {
    View, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { Text, Searchbar } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, STATUS_CONFIG } from "../../styles/Styles";

const DOCTOR_TRANSITIONS = {
    pending:     ["confirmed", "cancelled"],
    confirmed:   ["in_progress", "no_show"],
    in_progress: ["completed"],
};
const TRANSITION_ICONS = {
    confirmed:   "check-circle-outline",
    in_progress: "stethoscope",
    completed:   "check-all",
    cancelled:   "close-circle-outline",
    no_show:     "account-off-outline",
};


const AppointmentCard = ({ item, onUpdateStatus, onPress }) => {
    const date    = new Date(item.appointment_date);
    const dateStr = date.toLocaleDateString("vi-VN");
    const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const sCfg       = STATUS_CONFIG[item.status] || {};
    const transitions = DOCTOR_TRANSITIONS[item.status] || [];

    return (
        <TouchableOpacity style={Styles.appointmentCard} onPress={onPress} activeOpacity={0.8}>
            <View style={Styles.apptCardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={Styles.apptName} numberOfLines={1}>
                        {item.patient_info?.full_name || `Bệnh nhân #${item.patient}`}
                    </Text>
                    <Text style={Styles.apptDoctor}>{dateStr} • {timeStr}</Text>
                </View>
                <View style={[Styles.statusBadge, { backgroundColor: (sCfg.color || COLORS.primary) + "20" }]}>
                    <Text style={[Styles.statusText, { color: sCfg.color || COLORS.primary }]}>
                        {sCfg.label}
                    </Text>
                </View>
            </View>

            {item.reason ? (
                <Text style={Styles.apptReason} numberOfLines={2}>{item.reason}</Text>
            ) : null}

            {transitions.length > 0 && (
                <View style={Styles.apptActions}>
                    {transitions.map(next => {
                        const cfg = STATUS_CONFIG[next] || {};
                        return (
                            <TouchableOpacity
                                key={next}
                                style={[Styles.apptActionBtn, { borderColor: cfg.color }]}
                                onPress={() => onUpdateStatus(item.id, next)}
                            >
                                <MaterialCommunityIcons name={TRANSITION_ICONS[next] || "arrow-right"} size={14} color={cfg.color} />
                                <Text style={[Styles.apptActionLabel, { color: cfg.color }]}>{cfg.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    {item.status === "in_progress" && (
                        <TouchableOpacity
                            style={[Styles.apptActionBtn, { borderColor: COLORS.primary, backgroundColor: COLORS.primaryPale }]}
                            onPress={onPress}
                        >
                            <MaterialCommunityIcons name="file-edit-outline" size={14} color={COLORS.primary} />
                            <Text style={[Styles.apptActionLabel, { color: COLORS.primary }]}>Ghi hồ sơ</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const DoctorAppointments = () => {
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
            console.warn("DoctorAppointments load error:", e?.response?.status || e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [activeFilter]);

    const updateStatus = (id, newStatus) => {
        const cfg = STATUS_CONFIG[newStatus] || {};
        Alert.alert(
            "Xác nhận",
            `Chuyển trạng thái sang "${cfg.label}"?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xác nhận",
                    onPress: async () => {
                        try {
                            await authApis(user.token).patch(
                                endpoints["appointment-status"](id), { status: newStatus }
                            );
                            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
                        } catch (e) {
                            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
                        }
                    },
                },
            ]
        );
    };

    const filtered = appointments.filter(a => {
        const name = (a.patient_info?.full_name || "").toLowerCase();
        return name.includes(search.toLowerCase());
    });

    return (
        <View style={Styles.container}>
            <View style={Styles.searchWrap}>
                <Searchbar
                    placeholder="Tìm bệnh nhân..."
                    value={search}
                    onChangeText={setSearch}
                    style={Styles.searchInput}
                    iconColor={COLORS.primary}
                />
            </View>

            <View style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={Object.entries(STATUS_CONFIG)}
                    keyExtractor={([k]) => k}
                    renderItem={({ item: [key, cfg] }) => (
                        <TouchableOpacity
                            style={[
                                Styles.filterChip,
                                activeFilter === key && [Styles.filterChipActive, { backgroundColor: cfg.color }],
                            ]}
                            onPress={() => setActiveFilter(key)}
                        >
                            <Text style={[
                                Styles.filterChipText,
                                activeFilter === key && Styles.filterChipTextActive,
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
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => (
                        <AppointmentCard
                            item={item}
                            onUpdateStatus={updateStatus}
                            onPress={() => nav.navigate("doctor-appointment-detail", { id: item.id })}
                        />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(); }}
                        />
                    }
                    ListEmptyComponent={
                        <View style={Styles.emptyWrap}>
                            <MaterialCommunityIcons name="calendar-blank" size={52} color={COLORS.border} />
                            <Text style={Styles.emptyText}>Không có lịch hẹn nào</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                />
            )}
        </View>
    );
};

export default DoctorAppointments;
