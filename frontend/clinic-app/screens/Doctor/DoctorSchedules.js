/**
 * screens/Doctor/DoctorSchedules.js
 * Bác sĩ quản lý lịch làm việc: xem, tạo, cập nhật, xóa lịch
 */
import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Modal, ScrollView,
} from "react-native";
import { Text, Button, TextInput, HelperText } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const DAYS_VN = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const ScheduleCard = ({ item, onDelete, onToggle }) => {
    const date = new Date(item.date + "T00:00:00");
    const dayOfWeek = DAYS_VN[date.getDay()];

    return (
        <View style={styles.card}>
            <View style={styles.dateBox}>
                <Text style={styles.dayOfWeek}>{dayOfWeek}</Text>
                <Text style={styles.dateNum}>{date.getDate()}</Text>
                <Text style={styles.dateMonth}>{date.getMonth() + 1}/{date.getFullYear()}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={styles.timeRange}>
                    {item.start_time?.slice(0, 5)} — {item.end_time?.slice(0, 5)}
                </Text>
                <Text style={styles.apptInfo}>
                    Tối đa: {item.max_appointments} ca • Đã đặt: {item.booked_count || 0} ca
                </Text>
                <View style={[
                    styles.availBadge,
                    { backgroundColor: item.is_available ? COLORS.greenPale : COLORS.redPale }
                ]}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: item.is_available ? COLORS.green : COLORS.red }}>
                        {item.is_available ? "Đang mở" : "Đã đóng"}
                    </Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => onToggle(item)}
                >
                    <MaterialCommunityIcons
                        name={item.is_available ? "toggle-switch" : "toggle-switch-off"}
                        size={28}
                        color={item.is_available ? COLORS.green : COLORS.textLight}
                    />
                </TouchableOpacity>
                {(item.booked_count || 0) === 0 && (
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => onDelete(item.id)}
                    >
                        <MaterialCommunityIcons name="delete-outline" size={22} color={COLORS.red} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const CreateScheduleModal = ({ visible, onClose, onSuccess }) => {
    const user = useContext(MyUserContext);
    const [form, setForm] = useState({
        date: "", start_time: "", end_time: "", max_appointments: "10",
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    const validate = () => {
        if (!form.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            setErr("Ngày phải theo định dạng YYYY-MM-DD"); return false;
        }
        if (!form.start_time.match(/^\d{2}:\d{2}$/)) {
            setErr("Giờ bắt đầu phải theo định dạng HH:MM"); return false;
        }
        if (!form.end_time.match(/^\d{2}:\d{2}$/)) {
            setErr("Giờ kết thúc phải theo định dạng HH:MM"); return false;
        }
        return true;
    };

    const save = async () => {
        if (!validate()) return;
        try {
            setSaving(true); setErr(null);
            await authApis(user.token).post(endpoints["schedules"], {
                ...form,
                max_appointments: parseInt(form.max_appointments) || 10,
            });
            onSuccess();
            onClose();
            setForm({ date: "", start_time: "", end_time: "", max_appointments: "10" });
        } catch (e) {
            const detail = e?.response?.data;
            setErr(typeof detail === "string" ? detail : JSON.stringify(detail) || "Lỗi tạo lịch!");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Tạo lịch làm việc</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                <TextInput
                    label="Ngày (YYYY-MM-DD) *"
                    value={form.date}
                    onChangeText={(t) => setForm({ ...form, date: t })}
                    mode="outlined" placeholder="2025-01-15"
                    style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <View style={styles.row}>
                    <TextInput
                        label="Giờ bắt đầu *"
                        value={form.start_time}
                        onChangeText={(t) => setForm({ ...form, start_time: t })}
                        mode="outlined" placeholder="08:00"
                        style={[styles.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                    <TextInput
                        label="Giờ kết thúc *"
                        value={form.end_time}
                        onChangeText={(t) => setForm({ ...form, end_time: t })}
                        mode="outlined" placeholder="12:00"
                        style={[styles.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                </View>
                <TextInput
                    label="Số lượng ca tối đa"
                    value={form.max_appointments}
                    onChangeText={(t) => setForm({ ...form, max_appointments: t })}
                    mode="outlined" keyboardType="numeric"
                    style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <Button
                    mode="contained" onPress={save} loading={saving} disabled={saving}
                    style={{ borderRadius: 10 }} buttonColor={COLORS.primary}
                >
                    Tạo lịch làm việc
                </Button>
            </ScrollView>
        </Modal>
    );
};

const DoctorSchedules = () => {
    const user = useContext(MyUserContext);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["doctor-my-schedules"]);
            setSchedules(res.data);
        } catch (e) {
            console.error(e?.response?.data || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggleAvailability = async (item) => {
        try {
            await authApis(user.token).patch(endpoints["schedule-detail"](item.id), {
                is_available: !item.is_available,
            });
            setSchedules((prev) =>
                prev.map((s) => s.id === item.id ? { ...s, is_available: !s.is_available } : s)
            );
        } catch (e) {
            Alert.alert("Lỗi", "Không thể cập nhật lịch!");
        }
    };

    const deleteSchedule = (id) => {
        Alert.alert("Xóa lịch", "Bạn có chắc muốn xóa lịch này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xóa",
                style: "destructive",
                onPress: async () => {
                    try {
                        await authApis(user.token).delete(endpoints["schedule-detail"](id));
                        setSchedules((prev) => prev.filter((s) => s.id !== id));
                    } catch (e) {
                        Alert.alert("Lỗi", "Không thể xóa lịch này!");
                    }
                },
            },
        ]);
    };

    // Group lịch theo tháng
    const groupedSchedules = schedules.reduce((acc, s) => {
        const month = s.date?.slice(0, 7) || "";
        if (!acc[month]) acc[month] = [];
        acc[month].push(s);
        return acc;
    }, {});

    const sections = Object.entries(groupedSchedules).sort(([a], [b]) => a.localeCompare(b));

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Lịch làm việc</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setShowModal(true)}
                >
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Thêm lịch</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={sections}
                    keyExtractor={([month]) => month}
                    renderItem={({ item: [month, items] }) => (
                        <View>
                            <Text style={styles.monthHeader}>
                                Tháng {month.split("-")[1]}/{month.split("-")[0]}
                            </Text>
                            {items.map((s) => (
                                <ScheduleCard
                                    key={s.id}
                                    item={s}
                                    onDelete={deleteSchedule}
                                    onToggle={toggleAvailability}
                                />
                            ))}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={[Styles.center, { flex: 1, marginTop: 80 }]}>
                            <MaterialCommunityIcons name="calendar-blank-outline" size={56} color={COLORS.border} />
                            <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 15 }}>
                                Chưa có lịch làm việc
                            </Text>
                            <Text style={{ color: COLORS.textLight, marginTop: 4, fontSize: 13 }}>
                                Nhấn "Thêm lịch" để tạo mới
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                />
            )}

            <CreateScheduleModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={load}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
    addBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    },
    addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    monthHeader: {
        fontSize: 14, fontWeight: "700", color: COLORS.textMuted,
        paddingVertical: 10, paddingHorizontal: 4,
    },
    card: {
        backgroundColor: "#fff", borderRadius: 12, padding: 12,
        flexDirection: "row", alignItems: "center", marginBottom: 10,
        elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07, shadowRadius: 4,
    },
    dateBox: {
        width: 56, alignItems: "center", paddingRight: 12,
        borderRightWidth: 1, borderRightColor: COLORS.border,
    },
    dayOfWeek: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
    dateNum: { fontSize: 24, fontWeight: "900", color: COLORS.text, lineHeight: 28 },
    dateMonth: { fontSize: 10, color: COLORS.textMuted },
    timeRange: { fontSize: 16, fontWeight: "700", color: COLORS.text },
    apptInfo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    availBadge: {
        alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6, marginTop: 6,
    },
    cardActions: { alignItems: "center", gap: 4 },
    iconBtn: { padding: 4 },
    // Modal
    modalHeader: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    input: { backgroundColor: "#fff", marginBottom: 12 },
    row: { flexDirection: "row", gap: 10 },
});

export default DoctorSchedules;