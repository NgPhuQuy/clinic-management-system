import {
    View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from "react-native";
import { Text, Searchbar } from "react-native-paper";
import { useState, useEffect, useContext, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, staffFindPatientStyles as S } from "../../styles/Styles";

const PatientCard = ({ item, onPress }) => (
    <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.85}>
        <View style={S.avatar}>
            <Text style={S.avatarText}>
                {(item.full_name || "?").charAt(0).toUpperCase()}
            </Text>
        </View>

        <View style={{ flex: 1 }}>
            <Text style={S.patientName}>{item.full_name}</Text>
            <View style={S.infoRow}>
                <MaterialCommunityIcons name="phone" size={12} color={COLORS.textMuted} />
                <Text style={S.infoText}>{item.phone || "Chưa cập nhật"}</Text>
            </View>
            {item.date_of_birth && (
                <View style={S.infoRow}>
                    <MaterialCommunityIcons name="cake-variant" size={12} color={COLORS.textMuted} />
                    <Text style={S.infoText}>{item.date_of_birth}</Text>
                </View>
            )}
            {item.insurance_number && (
                <View style={S.infoRow}>
                    <MaterialCommunityIcons name="card-account-details" size={12} color={COLORS.primary} />
                    <Text style={[S.infoText, { color: COLORS.primary }]}>
                        BHYT: {item.insurance_number}
                    </Text>
                </View>
            )}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
);

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
        <View style={S.modalOverlay}>
            <View style={S.modalBox}>
                <View style={S.modalHeader}>
                    <View style={S.modalAvatar}>
                        <Text style={S.modalAvatarText}>
                            {patient.full_name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={S.modalName}>{patient.full_name}</Text>
                        <Text style={S.modalEmail}>{patient.email || ""}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={24} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={S.patientInfo}>
                    {[
                        { icon: "phone",             label: "Điện thoại",    value: patient.phone },
                        { icon: "cake-variant",      label: "Ngày sinh",     value: patient.date_of_birth },
                        { icon: "gender-male-female",label: "Giới tính",     value: patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : null },
                        { icon: "card-account-details",label: "BHYT",        value: patient.insurance_number },
                        { icon: "water",             label: "Nhóm máu",      value: patient.blood_type },
                        { icon: "phone-alert",       label: "Liên hệ khẩn",  value: patient.emergency_contact },
                    ].filter((r) => r.value).map(({ icon, label, value }) => (
                        <View key={label} style={S.patientInfoRow}>
                            <MaterialCommunityIcons name={icon} size={14} color={COLORS.primary} style={{ width: 18 }} />
                            <Text style={S.patientInfoLabel}>{label}:</Text>
                            <Text style={S.patientInfoValue}>{value}</Text>
                        </View>
                    ))}
                </View>

                <Text style={S.historyTitle}>
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
                                    style={S.apptRow}
                                    onPress={() => {
                                        onClose();
                                        nav.navigate("staff-appointment-detail", { id: appt.id });
                                    }}
                                >
                                    <View style={[S.apptDot, { backgroundColor: color }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={S.apptDate}>
                                            {d.toLocaleDateString("vi-VN")} — BS. {appt.doctor_info?.full_name || "#" + appt.doctor}
                                        </Text>
                                        <Text style={[S.apptStatus, { color }]}>
                                            {STATUS_LABELS[appt.status] || appt.status}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textLight} />
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <Text style={S.emptyAppt}>Chưa có lịch sử khám</Text>
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
        <View style={S.container}>
            <View style={S.searchBox}>
                <Searchbar
                    placeholder="Nhập tên, SĐT hoặc số BHYT..."
                    value={query}
                    onChangeText={onSearch}
                    style={S.searchInput}
                    iconColor={COLORS.primary}
                    autoFocus
                />
                <Text style={S.hint}>
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
                                <Text style={S.emptyText}>Không tìm thấy bệnh nhân nào</Text>
                            </View>
                        ) : (
                            <View style={[Styles.center, { marginTop: 60 }]}>
                                <MaterialCommunityIcons name="magnify" size={52} color={COLORS.border} />
                                <Text style={S.emptyText}>Nhập từ khóa để tìm kiếm</Text>
                            </View>
                        )
                    }
                    contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
                />
            )}

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
export default StaffFindPatient;