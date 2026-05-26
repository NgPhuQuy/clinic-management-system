/**
 * screens/Staff/StaffAppointments.js
 * Nhân viên y tế quản lý lịch hẹn – kết nối backend, fallback mock
 */
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

const MOCK_APPOINTMENTS = [
    { id:1, patient_info:{full_name:"Nguyễn Thị Mai"}, doctor_info:{full_name:"Nguyễn Văn An", specialty_name:"Tim mạch"}, appointment_date: new Date(Date.now()+0.5*3600*1000).toISOString(), status:"pending",     reason:"Đau ngực, khó thở khi gắng sức" },
    { id:2, patient_info:{full_name:"Trần Văn Bảo"},   doctor_info:{full_name:"Lê Minh Cường",  specialty_name:"Nội tiêu hóa"}, appointment_date: new Date(Date.now()+1.5*3600*1000).toISOString(), status:"confirmed",   reason:"Kiểm tra sức khỏe định kỳ" },
    { id:3, patient_info:{full_name:"Lê Thị Cúc"},     doctor_info:{full_name:"Phạm Thị Dung",  specialty_name:"Thần kinh"},    appointment_date: new Date(Date.now()+2*3600*1000).toISOString(),   status:"in_progress", reason:"Đau đầu dữ dội, chóng mặt" },
    { id:4, patient_info:{full_name:"Phạm Minh Đức"},  doctor_info:{full_name:"Hoàng Văn Em",   specialty_name:"Da liễu"},      appointment_date: new Date(Date.now()-1*3600*1000).toISOString(),   status:"completed",   reason:"Nổi mẩn đỏ toàn thân" },
    { id:5, patient_info:{full_name:"Hoàng Thị Em"},   doctor_info:{full_name:"Vũ Thị Phương",  specialty_name:"Nhi khoa"},     appointment_date: new Date(Date.now()-2*3600*1000).toISOString(),   status:"cancelled",   reason:"Trẻ sốt cao liên tục" },
    { id:6, patient_info:{full_name:"Vũ Văn Phúc"},    doctor_info:{full_name:"Đặng Minh Quân", specialty_name:"Sản phụ khoa"}, appointment_date: new Date(Date.now()+3*3600*1000).toISOString(),   status:"confirmed",   reason:"Đau lưng dưới lan xuống chân" },
    { id:7, patient_info:{full_name:"Đặng Thị Giang"}, doctor_info:{full_name:"Bùi Thị Hoa",    specialty_name:"Chấn thương"},  appointment_date: new Date(Date.now()+4*3600*1000).toISOString(),   status:"pending",     reason:"Đau khớp gối phải" },
];

const AppointmentCard = ({ item, onUpdateStatus, onPress }) => {
    const date    = new Date(item.appointment_date);
    const dateStr = date.toLocaleDateString("vi-VN");
    const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const sCfg       = STATUS_CONFIG[item.status] || {};
    const transitions = STAFF_TRANSITIONS[item.status] || [];

    return (
        <TouchableOpacity style={Styles.appointmentCard} onPress={onPress} activeOpacity={0.85}>
            <View style={Styles.apptCardTop}>
                <View style={[Styles.apptDot, { backgroundColor: sCfg.color || COLORS.primary }]} />
                <View style={{ flex: 1 }}>
                    <Text style={Styles.apptName} numberOfLines={1}>
                        {item.patient_info?.full_name || `Bệnh nhân #${item.patient}`}
                    </Text>
                    <Text style={Styles.apptDoctor}>
                        BS. {item.doctor_info?.full_name || "–"}
                    </Text>
                </View>
                <View style={[Styles.statusBadge, { backgroundColor: (sCfg.color || COLORS.primary) + "20" }]}>
                    <Text style={[Styles.statusText, { color: sCfg.color || COLORS.primary }]}>
                        {sCfg.label}
                    </Text>
                </View>
            </View>

            <View style={Styles.apptInfoRow}>
                <MaterialCommunityIcons name="calendar-clock" size={14} color={COLORS.textMuted} />
                <Text style={Styles.apptInfoText}>{dateStr} lúc {timeStr}</Text>
                {item.doctor_info?.specialty_name && (
                    <>
                        <Text style={{ fontSize: 12, color: COLORS.border }}> • </Text>
                        <Text style={Styles.apptInfoText}>{item.doctor_info.specialty_name}</Text>
                    </>
                )}
            </View>

            {item.reason ? (
                <Text style={Styles.apptReason} numberOfLines={1}>📋 {item.reason}</Text>
            ) : null}

            {transitions.length > 0 && (
                <View style={Styles.apptActions}>
                    {transitions.map(next => {
                        const cfg = STATUS_CONFIG[next] || {};
                        return (
                            <TouchableOpacity
                                key={next}
                                style={[Styles.apptActionBtn, { borderColor: cfg.color }]}
                                onPress={() => onUpdateStatus(item.id, next, item)}
                            >
                                <MaterialCommunityIcons
                                    name={TRANSITION_ICONS[next] || "arrow-right"}
                                    size={13}
                                    color={cfg.color}
                                />
                                <Text style={[Styles.apptActionLabel, { color: cfg.color }]}>
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
            console.warn("StaffAppointments: dùng mock –", e?.response?.status || e.message);
            const filtered = activeFilter === "all"
                ? MOCK_APPOINTMENTS
                : MOCK_APPOINTMENTS.filter(a => a.status === activeFilter);
            setAppointments(filtered);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [activeFilter]);

    const updateStatus = (id, newStatus, item) => {
        const cfg = STATUS_CONFIG[newStatus] || {};
        Alert.alert(
            "Xác nhận thao tác",
            `Chuyển lịch hẹn của ${item?.patient_info?.full_name || "bệnh nhân"} sang "${cfg.label}"?`,
            [
                { text: "Hủy bỏ", style: "cancel" },
                {
                    text: "Xác nhận",
                    style: newStatus === "cancelled" ? "destructive" : "default",
                    onPress: async () => {
                        try {
                            await authApis(user.token).patch(
                                endpoints["appointment-status"](id), { status: newStatus }
                            );
                        } catch (e) {
                            // fallback – vẫn cập nhật UI
                        }
                        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
                    },
                },
            ]
        );
    };

    const filtered = appointments.filter(a => {
        const name = (a.patient_info?.full_name || "").toLowerCase();
        const doc  = (a.doctor_info?.full_name  || "").toLowerCase();
        const q    = search.toLowerCase();
        return name.includes(q) || doc.includes(q);
    });

    return (
        <View style={Styles.container}>
            <View style={Styles.searchWrap}>
                <Searchbar
                    placeholder="Tìm bệnh nhân hoặc bác sĩ..."
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
                    contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
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
                            onPress={() => nav.navigate("staff-appointment-detail", { id: item.id })}
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
                        <View style={Styles.emptyWrap}>
                            <MaterialCommunityIcons name="calendar-blank" size={52} color={COLORS.border} />
                            <Text style={Styles.emptyText}>Không có lịch hẹn nào</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
                />
            )}
        </View>
    );
};

export default StaffAppointments;
