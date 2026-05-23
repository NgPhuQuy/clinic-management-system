/**
 * screens/Staff/StaffFindPatient.js
 * Nhân viên tìm kiếm bệnh nhân:
 *   - Tìm theo tên, SĐT, số BHYT
 *   - Xem thông tin cơ bản + lịch sử khám
 *   - Điều hướng đến lịch hẹn cụ thể
 */
import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from "react-native";
import { Text, Searchbar } from "react-native-paper";
import { useState, useEffect, useContext, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const PatientCard = ({ item, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        {/* Avatar placeholder */}
        <View style={styles.avatar}>
            <Text style={styles.avatarText}>
                {(item.full_name || "?").charAt(0).toUpperCase()}
            </Text>
        </View>

        <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.full_name}</Text>
            <View style={styles.infoRow}>
                <MaterialCommunityIcons name="phone" size={12} color={COLORS.textMuted} />
                <Text style={styles.infoText}>{item.phone || "Chưa cập nhật"}</Text>
            </View>
            {item.date_of_birth && (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="cake-variant" size={12} color={COLORS.textMuted} />
                    <Text style={styles.infoText}>{item.date_of_birth}</Text>
                </View>
            )}
            {item.insurance_number && (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="card-account-details" size={12} color={COLORS.primary} />
                    <Text style={[styles.infoText, { color: COLORS.primary }]}>
                        BHYT: {item.insurance_number}
                    </Text>
                </View>
            )}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
);

// Chi tiết bệnh nhân: lịch sử khám
const PatientDetailModal = ({ patient, onClose, nav }) => {
    const user = useContext(MyUserContext);
    const [appointments, setAppointments] = useState([]);
    const [loading,      setLoading]      = useState(true);

    useEffect(() => {
        if (!patient) return;
        authApis(user.token)
            .get(endpoints["patient-appointments"](patient.id))
            .then((res) => setAppointments(res.data.results || res.data))
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, [patient?.id]);

    if (!patient) return null;

    const STATUS_COLORS = {
        pending: COLORS.orange, confirmed: COLORS.green,
        in_progress: COLORS.purple, completed: COLORS.primary,
        cancelled: COLORS.red, no_show: COLORS.textLight,
    };
    const STATUS_LABELS = {
        pending: "Chờ xác nhận", confirmed: "Đã xác nhận",
        in_progress: "Đang khám", completed: "Hoàn thành",
        cancelled: "Đã hủy", no_show: "Không đến",
    };

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
                {/* Header */}
                <View style={styles.modalHeader}>
                    <View style={styles.modalAvatar}>
                        <Text style={styles.modalAvatarText}>
                            {patient.full_name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.modalName}>{patient.full_name}</Text>
                        <Text style={styles.modalEmail}>{patient.email || ""}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={24} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Patient Info */}
                <View style={styles.patientInfo}>
                    {[
                        { icon: "phone",             label: "Điện thoại",    value: patient.phone },
                        { icon: "cake-variant",      label: "Ngày sinh",     value: patient.date_of_birth },
                        { icon: "gender-male-female",label: "Giới tính",     value: patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : null },
                        { icon: "card-account-details",label: "BHYT",        value: patient.insurance_number },
                        { icon: "water",             label: "Nhóm máu",      value: patient.blood_type },
                        { icon: "phone-alert",       label: "Liên hệ khẩn",  value: patient.emergency_contact },
                    ].filter((r) => r.value).map(({ icon, label, value }) => (
                        <View key={label} style={styles.patientInfoRow}>
                            <MaterialCommunityIcons name={icon} size={14} color={COLORS.primary} style={{ width: 18 }} />
                            <Text style={styles.patientInfoLabel}>{label}:</Text>
                            <Text style={styles.patientInfoValue}>{value}</Text>
                        </View>
                    ))}
                </View>

                {/* Appointment history */}
                <Text style={styles.historyTitle}>
                    Lịch sử khám ({appointments.length} lần)
                </Text>

                {loading ? (
                    <View style={[Styles.center, { padding: 20 }]}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={appointments.slice(0, 8)}
                        keyExtractor={(item) => String(item.id)}
                        style={{ maxHeight: 220 }}
                        renderItem={({ item: appt }) => {
                            const d = new Date(appt.appointment_date);
                            const color = STATUS_COLORS[appt.status] || COLORS.textMuted;
                            return (
                                <TouchableOpacity
                                    style={styles.apptRow}
                                    onPress={() => {
                                        onClose();
                                        nav.navigate("staff-appointment-detail", { id: appt.id });
                                    }}
                                >
                                    <View style={[styles.apptDot, { backgroundColor: color }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.apptDate}>
                                            {d.toLocaleDateString("vi-VN")} — BS. {appt.doctor_info?.full_name || "#" + appt.doctor}
                                        </Text>
                                        <Text style={[styles.apptStatus, { color }]}>
                                            {STATUS_LABELS[appt.status] || appt.status}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textLight} />
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <Text style={styles.emptyAppt}>Chưa có lịch sử khám</Text>
                        }
                    />
                )}
            </View>
        </View>
    );
};

const StaffFindPatient = () => {
    const nav  = useNavigation();
    const user = useContext(MyUserContext);

    const [query,    setQuery]    = useState("");
    const [results,  setResults]  = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [selected, setSelected] = useState(null);
    const searchTimer = useRef(null);

    const doSearch = async (q) => {
        if (!q.trim() || q.length < 2) {
            setResults([]);
            return;
        }
        try {
            setLoading(true);
            const res = await authApis(user.token).get(
                endpoints["staff-patients"],
                { params: { search: q } }
            );
            setResults(res.data.results || res.data);
        } catch (e) {
            console.error(e?.response?.data || e.message);
        } finally {
            setLoading(false);
        }
    };

    const onSearch = (text) => {
        setQuery(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => doSearch(text), 400);
    };

    return (
        <View style={styles.container}>
            {/* Search bar */}
            <View style={styles.searchBox}>
                <Searchbar
                    placeholder="Nhập tên, SĐT hoặc số BHYT..."
                    value={query}
                    onChangeText={onSearch}
                    style={styles.searchInput}
                    iconColor={COLORS.primary}
                    autoFocus
                />
                <Text style={styles.hint}>
                    Nhập ít nhất 2 ký tự để tìm kiếm
                </Text>
            </View>

            {loading ? (
                <View style={[Styles.center, { marginTop: 40 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <PatientCard
                            item={item}
                            onPress={() => setSelected(item)}
                        />
                    )}
                    ListEmptyComponent={
                        query.length >= 2 ? (
                            <View style={[Styles.center, { marginTop: 60 }]}>
                                <MaterialCommunityIcons name="account-search" size={52} color={COLORS.border} />
                                <Text style={styles.emptyText}>Không tìm thấy bệnh nhân nào</Text>
                            </View>
                        ) : (
                            <View style={[Styles.center, { marginTop: 60 }]}>
                                <MaterialCommunityIcons name="magnify" size={52} color={COLORS.border} />
                                <Text style={styles.emptyText}>Nhập từ khóa để tìm kiếm</Text>
                            </View>
                        )
                    }
                    contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
                />
            )}

            {/* Patient detail modal */}
            {selected && (
                <PatientDetailModal
                    patient={selected}
                    onClose={() => setSelected(null)}
                    nav={nav}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: COLORS.bg },
    searchBox:   { backgroundColor: "#fff", padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    searchInput: { backgroundColor: COLORS.bg, elevation: 0 },
    hint:        { fontSize: 12, color: COLORS.textLight, marginTop: 4, marginLeft: 4 },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        flexDirection: "row", alignItems: "center", gap: 12,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    avatar: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center",
    },
    avatarText:  { fontSize: 20, fontWeight: "800", color: COLORS.primary },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
    infoRow:     { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    infoText:    { fontSize: 12, color: COLORS.textMuted },
    emptyText:   { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
    // Modal
    modalOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
    },
    modalBox: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, maxHeight: "85%",
    },
    modalHeader:     { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
    modalAvatar: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center",
    },
    modalAvatarText: { fontSize: 22, fontWeight: "800", color: COLORS.primary },
    modalName:       { fontSize: 17, fontWeight: "800", color: COLORS.text },
    modalEmail:      { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
    patientInfo: {
        backgroundColor: COLORS.bg, borderRadius: 10,
        padding: 12, marginBottom: 14,
    },
    patientInfoRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    patientInfoLabel: { fontSize: 12, color: COLORS.textMuted, minWidth: 80 },
    patientInfoValue: { fontSize: 13, color: COLORS.text, fontWeight: "500", flex: 1 },
    historyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
    apptRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    apptDot:    { width: 10, height: 10, borderRadius: 5 },
    apptDate:   { fontSize: 13, fontWeight: "600", color: COLORS.text },
    apptStatus: { fontSize: 11, fontWeight: "600", marginTop: 2 },
    emptyAppt:  { color: COLORS.textMuted, textAlign: "center", paddingVertical: 12 },
});

export default StaffFindPatient;