import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Modal, ScrollView,
} from "react-native";
import { Text, Button, TextInput, HelperText } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, doctorSchedulesStyles as S } from "../../styles/Styles";


const MOCK_SCHEDULES = (() => {
    const today = new Date();
    const slots = [];
    for (let d = 0; d < 14; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + d);
        if (date.getDay() === 0) continue; // skip Sunday
        const isAM = d % 2 === 0;
        slots.push({
            id: d + 1,
            date: date.toISOString().slice(0,10),
            start_time: isAM ? "07:30:00" : "13:00:00",
            end_time:   isAM ? "11:30:00" : "17:00:00",
            max_appointments: 10,
            current_appointments: Math.floor(Math.random() * 8),
            is_available: d > 0,
        });
    }
    return slots;
})();

const DAYS_VN = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const ScheduleCard = ({ item, onDelete, onToggle }) => {
    const date = new Date(item.date + "T00:00:00");
    const dayOfWeek = DAYS_VN[date.getDay()];

    return (
        <View style={S.card}>
            <View style={S.dateBox}>
                <Text style={S.dayOfWeek}>{dayOfWeek}</Text>
                <Text style={S.dateNum}>{date.getDate()}</Text>
                <Text style={S.dateMonth}>{date.getMonth() + 1}/{date.getFullYear()}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={S.timeRange}>
                    {item.start_time?.slice(0, 5)} — {item.end_time?.slice(0, 5)}
                </Text>
                <Text style={S.apptInfo}>
                    Tối đa: {item.max_appointments} ca • Đã đặt: {item.booked_count || 0} ca
                </Text>
                <View style={[
                    S.availBadge,
                    { backgroundColor: item.is_available ? COLORS.greenPale : COLORS.redPale }
                ]}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: item.is_available ? COLORS.green : COLORS.red }}>
                        {item.is_available ? "Đang mở" : "Đã đóng"}
                    </Text>
                </View>
            </View>
            <View style={S.cardActions}>
                <TouchableOpacity
                    style={S.iconBtn}
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
                        style={S.iconBtn}
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
            <View style={S.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={S.modalTitle}>Tạo lịch làm việc</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                <TextInput
                    label="Ngày (YYYY-MM-DD) *"
                    value={form.date}
                    onChangeText={(t) => setForm({ ...form, date: t })}
                    mode="outlined" placeholder="2025-01-15"
                    style={S.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <View style={S.row}>
                    <TextInput
                        label="Giờ bắt đầu *"
                        value={form.start_time}
                        onChangeText={(t) => setForm({ ...form, start_time: t })}
                        mode="outlined" placeholder="08:00"
                        style={[S.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                    <TextInput
                        label="Giờ kết thúc *"
                        value={form.end_time}
                        onChangeText={(t) => setForm({ ...form, end_time: t })}
                        mode="outlined" placeholder="12:00"
                        style={[S.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                </View>
                <TextInput
                    label="Số lượng ca tối đa"
                    value={form.max_appointments}
                    onChangeText={(t) => setForm({ ...form, max_appointments: t })}
                    mode="outlined" keyboardType="numeric"
                    style={S.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
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
            console.warn("DoctorSchedules: dùng mock –", e?.response?.status || e.message);
            setSchedules(MOCK_SCHEDULES);
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
        <View style={S.container}>
            {/* Header */}
            <View style={S.header}>
                <Text style={S.headerTitle}>Lịch làm việc</Text>
                <TouchableOpacity
                    style={S.addBtn}
                    onPress={() => setShowModal(true)}
                >
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    <Text style={S.addBtnText}>Thêm lịch</Text>
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
                            <Text style={S.monthHeader}>
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
export default DoctorSchedules;