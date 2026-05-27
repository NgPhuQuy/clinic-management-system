import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Modal,
} from "react-native";
import { Text, TextInput, Button, HelperText, Searchbar } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";
import { DatePickerField } from "../../components/DatePickerField";

const TEST_TYPE_LABELS = {
    blood: "XN Máu", urine: "XN Nước tiểu", stool: "XN Phân",
    micro: "Vi sinh", xray: "X-quang", ct: "Chụp CT",
    mri: "Chụp MRI", ultrasound: "Siêu âm", endoscopy: "Nội soi",
    ecg: "Điện tâm đồ", other: "Khác",
};

const TEST_TYPE_ICONS = {
    blood: "water-plus", urine: "flask-outline", stool: "microscope",
    micro: "bacteria-outline", xray: "radiobox-marked", ct: "circle-slice-8",
    mri: "magnet-on", ultrasound: "waveform", endoscopy: "camera-outline",
    ecg: "pulse", other: "test-tube",
};

const TODAY = new Date().toISOString().split("T")[0];

const FillResultModal = ({ visible, test, onClose, onSuccess }) => {
    const user = useContext(MyUserContext);
    const [form, setForm] = useState({ result: "", unit: "", reference_range: "", test_date: TODAY });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (visible) setForm({ result: "", unit: test?.unit || "", reference_range: test?.reference_range || "", test_date: TODAY });
    }, [visible, test]);

    const save = async () => {
        if (!form.result.trim()) { setErr("Vui lòng nhập kết quả!"); return; }
        try {
            setSaving(true); setErr(null);
            await authApis(user.token).patch(
                endpoints["test-result-detail"](test.id),
                { ...form, status: "completed" }
            );
            onSuccess();
            onClose();
        } catch (e) {
            setErr(e?.response?.data?.detail || "Lỗi lưu kết quả!");
        } finally {
            setSaving(false);
        }
    };

    if (!test) return null;
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.fillOverlay}>
                <View style={styles.fillSheet}>
                    <View style={styles.fillHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fillTitle}>Nhập kết quả xét nghiệm</Text>
                            <Text style={styles.fillSubtitle} numberOfLines={2}>{test.test_name}</Text>
                            {test.patient_name ? (
                                <Text style={styles.fillPatient}>BN: {test.patient_name}</Text>
                            ) : null}
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={22} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.typeTag, { alignSelf: "flex-start", marginBottom: 14 }]}>
                        <MaterialCommunityIcons name={TEST_TYPE_ICONS[test.test_type] || "test-tube"} size={13} color={COLORS.primary} />
                        <Text style={styles.typeTagText}>{TEST_TYPE_LABELS[test.test_type] || test.test_type}</Text>
                    </View>

                    <HelperText type="error" visible={!!err}>{err}</HelperText>

                    <TextInput
                        label="Kết quả *" value={form.result}
                        onChangeText={(t) => setForm({ ...form, result: t })}
                        mode="outlined" multiline numberOfLines={3} style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        placeholder="Nhập kết quả xét nghiệm..."
                    />
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <TextInput
                            label="Đơn vị" value={form.unit}
                            onChangeText={(t) => setForm({ ...form, unit: t })}
                            mode="outlined" style={[styles.input, { flex: 1 }]}
                            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        />
                        <TextInput
                            label="Tham chiếu" value={form.reference_range}
                            onChangeText={(t) => setForm({ ...form, reference_range: t })}
                            mode="outlined" style={[styles.input, { flex: 1 }]}
                            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        />
                    </View>
                    <DatePickerField
                        label="Ngày xét nghiệm"
                        value={form.test_date}
                        onChange={(v) => setForm({ ...form, test_date: v })}
                    />
                    <Button mode="contained" onPress={save} loading={saving}
                        style={{ borderRadius: 10, marginTop: 4 }} buttonColor={COLORS.green}>
                        Xác nhận kết quả
                    </Button>
                </View>
            </View>
        </Modal>
    );
};

const StaffTestResults = () => {
    const user = useContext(MyUserContext);
    const [tab, setTab] = useState("ordered"); // "ordered" | "completed"
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [fillTarget, setFillTarget] = useState(null);

    const load = async (statusFilter = tab) => {
        try {
            const res = await authApis(user.token).get(
                `${endpoints["test-results"]}?status=${statusFilter}`
            );
            setItems(res.data.results || res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { setLoading(true); load(tab); }, [tab]);

    const filtered = items.filter((t) => {
        const q = search.toLowerCase();
        return (
            (t.test_name || "").toLowerCase().includes(q) ||
            (t.patient_name || "").toLowerCase().includes(q) ||
            (TEST_TYPE_LABELS[t.test_type] || "").toLowerCase().includes(q)
        );
    });

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={[styles.iconBox, { backgroundColor: tab === "ordered" ? COLORS.orangePale : COLORS.greenPale }]}>
                    <MaterialCommunityIcons
                        name={TEST_TYPE_ICONS[item.test_type] || "test-tube"}
                        size={20}
                        color={tab === "ordered" ? COLORS.orange : COLORS.green}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.testName} numberOfLines={1}>{item.test_name}</Text>
                    <Text style={styles.typeLabel}>{TEST_TYPE_LABELS[item.test_type] || item.test_type}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    tab === "ordered"
                        ? { backgroundColor: COLORS.orangePale, borderColor: COLORS.orange }
                        : { backgroundColor: COLORS.greenPale, borderColor: COLORS.green }
                ]}>
                    <Text style={[styles.statusText, { color: tab === "ordered" ? COLORS.orange : COLORS.green }]}>
                        {tab === "ordered" ? "Chờ KQ" : "Có KQ"}
                    </Text>
                </View>
            </View>

            {item.patient_name ? (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.infoText}>{item.patient_name}</Text>
                </View>
            ) : null}
            <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.infoText}>Ngày chỉ định: {item.test_date}</Text>
            </View>

            {tab === "completed" && item.result ? (
                <View style={styles.resultBox}>
                    <Text style={styles.resultLabel}>Kết quả:</Text>
                    <Text style={styles.resultValue}>{item.result} {item.unit}</Text>
                    {item.reference_range ? (
                        <Text style={styles.refText}>Tham chiếu: {item.reference_range}</Text>
                    ) : null}
                </View>
            ) : null}

            {tab === "ordered" && (
                <TouchableOpacity style={styles.fillBtn} onPress={() => setFillTarget(item)}>
                    <MaterialCommunityIcons name="pencil-plus-outline" size={15} color="#fff" />
                    <Text style={styles.fillBtnText}>Nhập kết quả</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            {/* Tab toggle */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === "ordered" && styles.tabBtnActive]}
                    onPress={() => setTab("ordered")}
                >
                    <MaterialCommunityIcons name="clock-alert-outline" size={15}
                        color={tab === "ordered" ? "#fff" : COLORS.textMuted} />
                    <Text style={[styles.tabBtnText, tab === "ordered" && { color: "#fff" }]}>
                        Chờ kết quả
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === "completed" && { ...styles.tabBtnActive, backgroundColor: COLORS.green }]}
                    onPress={() => setTab("completed")}
                >
                    <MaterialCommunityIcons name="check-circle-outline" size={15}
                        color={tab === "completed" ? "#fff" : COLORS.textMuted} />
                    <Text style={[styles.tabBtnText, tab === "completed" && { color: "#fff" }]}>
                        Đã có kết quả
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff" }}>
                <Searchbar
                    placeholder="Tìm tên xét nghiệm, bệnh nhân..."
                    value={search}
                    onChangeText={setSearch}
                    style={{ backgroundColor: COLORS.bg, elevation: 0, height: 40 }}
                    iconColor={COLORS.primary}
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                    ListEmptyComponent={
                        <View style={[Styles.center, { marginTop: 60 }]}>
                            <MaterialCommunityIcons
                                name={tab === "ordered" ? "clipboard-clock-outline" : "clipboard-check-outline"}
                                size={52} color={COLORS.border}
                            />
                            <Text style={{ color: COLORS.textMuted, marginTop: 12, textAlign: "center" }}>
                                {tab === "ordered" ? "Không có xét nghiệm nào đang chờ kết quả" : "Chưa có kết quả nào được nhập"}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                />
            )}

            <FillResultModal
                visible={!!fillTarget}
                test={fillTarget}
                onClose={() => setFillTarget(null)}
                onSuccess={() => { setFillTarget(null); load(); }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    tabRow: {
        flexDirection: "row", backgroundColor: "#fff",
        paddingHorizontal: 16, paddingVertical: 10, gap: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        elevation: 2,
    },
    tabBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 8, borderRadius: 10,
        borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#fff",
    },
    tabBtnActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
    tabBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4,
    },
    cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    testName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    typeLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: "700" },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    infoText: { fontSize: 12, color: COLORS.textMuted },
    resultBox: {
        backgroundColor: COLORS.greenPale, borderRadius: 8, padding: 10,
        marginTop: 8, borderWidth: 1, borderColor: COLORS.green,
    },
    resultLabel: { fontSize: 11, color: COLORS.green, fontWeight: "700", marginBottom: 2 },
    resultValue: { fontSize: 14, fontWeight: "600", color: COLORS.text },
    refText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    fillBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        marginTop: 10, paddingVertical: 9, borderRadius: 10,
        backgroundColor: COLORS.primary,
    },
    fillBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
    typeTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.primaryPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeTagText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
    // Fill modal
    fillOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    fillSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    fillHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    fillTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    fillSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
    fillPatient: { fontSize: 12, color: COLORS.primary, fontWeight: "600", marginTop: 4 },
    input: { backgroundColor: "#fff", marginBottom: 10 },
});

export default StaffTestResults;
