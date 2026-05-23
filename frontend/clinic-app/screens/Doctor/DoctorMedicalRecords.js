/**
 * screens/Doctor/DoctorMedicalRecords.js
 * Bác sĩ xem và quản lý hồ sơ bệnh án của các bệnh nhân mình điều trị
 */
import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView, Modal, Alert,
} from "react-native";
import { Text, TextInput, Button, HelperText, Searchbar } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const TEST_TYPE_LABELS = {
    blood: "Xét nghiệm máu", urine: "Xét nghiệm nước tiểu", stool: "Xét nghiệm phân",
    micro: "Vi sinh / Cấy khuẩn", xray: "Chụp X-quang", ct: "Chụp CT",
    mri: "Chụp MRI", ultrasound: "Siêu âm", endoscopy: "Nội soi",
    ecg: "Điện tâm đồ (ECG)", other: "Khác",
};

const RecordCard = ({ item, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.cardTop}>
            <MaterialCommunityIcons name="file-document-outline" size={22} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.patientName} numberOfLines={1}>
                    {item.patient_info?.full_name || `Bệnh nhân #${item.patient}`}
                </Text>
                <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString("vi-VN")}
                </Text>
            </View>
            {item.prescription && (
                <View style={styles.prescBadge}>
                    <Text style={styles.prescBadgeText}>Có đơn thuốc</Text>
                </View>
            )}
        </View>
        <View style={styles.divider} />
        <Text style={styles.diagnosisLabel}>Chẩn đoán:</Text>
        <Text style={styles.diagnosisText} numberOfLines={2}>{item.diagnosis}</Text>
        {item.test_results?.length > 0 && (
            <Text style={styles.testCount}>
                {item.test_results.length} kết quả xét nghiệm
            </Text>
        )}
    </TouchableOpacity>
);

// Modal thêm kết quả xét nghiệm
const AddTestResultModal = ({ visible, onClose, recordId, onSuccess }) => {
    const user = useContext(MyUserContext);
    const [form, setForm] = useState({
        test_type: "other", test_name: "", result: "",
        unit: "", reference_range: "", test_date: "",
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    const testTypes = Object.entries(TEST_TYPE_LABELS);

    const save = async () => {
        if (!form.test_name || !form.result || !form.test_date) {
            setErr("Vui lòng điền đầy đủ: tên xét nghiệm, kết quả, ngày!"); return;
        }
        try {
            setSaving(true); setErr(null);
            await authApis(user.token).post(
                endpoints["medical-record-add-test"](recordId),
                form
            );
            onSuccess();
            onClose();
            setForm({ test_type: "other", test_name: "", result: "", unit: "", reference_range: "", test_date: "" });
        } catch (e) {
            setErr(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || "Lỗi lưu kết quả!");
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
                <Text style={styles.modalTitle}>Thêm kết quả xét nghiệm</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                <Text style={styles.fieldLabel}>Loại xét nghiệm</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={styles.typeRow}>
                        {testTypes.map(([key, label]) => (
                            <TouchableOpacity
                                key={key}
                                style={[styles.typeChip, form.test_type === key && styles.typeChipActive]}
                                onPress={() => setForm({ ...form, test_type: key })}
                            >
                                <Text style={[styles.typeChipText, form.test_type === key && { color: "#fff" }]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                <TextInput
                    label="Tên xét nghiệm *" value={form.test_name}
                    onChangeText={(t) => setForm({ ...form, test_name: t })}
                    mode="outlined" style={styles.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <TextInput
                    label="Kết quả *" value={form.result}
                    onChangeText={(t) => setForm({ ...form, result: t })}
                    mode="outlined" multiline numberOfLines={3} style={styles.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <View style={styles.row}>
                    <TextInput
                        label="Đơn vị" value={form.unit}
                        onChangeText={(t) => setForm({ ...form, unit: t })}
                        mode="outlined" style={[styles.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                    <TextInput
                        label="Khoảng tham chiếu" value={form.reference_range}
                        onChangeText={(t) => setForm({ ...form, reference_range: t })}
                        mode="outlined" style={[styles.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                </View>
                <TextInput
                    label="Ngày xét nghiệm (YYYY-MM-DD) *" value={form.test_date}
                    onChangeText={(t) => setForm({ ...form, test_date: t })}
                    mode="outlined" placeholder="2025-01-15" style={styles.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <Button
                    mode="contained" onPress={save} loading={saving}
                    style={{ borderRadius: 10 }} buttonColor={COLORS.primary}
                >
                    Lưu kết quả xét nghiệm
                </Button>
            </ScrollView>
        </Modal>
    );
};

// Detail screen cho một hồ sơ
export const DoctorMedicalRecordDetail = () => {
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { id } = route.params;
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTestModal, setShowTestModal] = useState(false);

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["medical-record-detail"](id));
            setRecord(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [id]);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    if (!record) return <View style={[Styles.center, { flex: 1 }]}><Text>Không tìm thấy hồ sơ</Text></View>;

    return (
        <>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
                {/* Patient */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Bệnh nhân</Text>
                    <Text style={styles.bigName}>{record.patient_info?.full_name}</Text>
                    <Text style={styles.subMuted}>{new Date(record.created_at).toLocaleDateString("vi-VN")}</Text>
                </View>

                {/* Medical Info */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Thông tin bệnh án</Text>
                    {[
                        { label: "Triệu chứng", value: record.symptoms },
                        { label: "Chẩn đoán", value: record.diagnosis },
                        { label: "Hướng điều trị", value: record.treatment_notes },
                        { label: "Ngày tái khám", value: record.follow_up_date },
                    ].map(({ label, value }) => (
                        value ? (
                            <View key={label} style={styles.infoBlock}>
                                <Text style={styles.infoLabel}>{label}</Text>
                                <Text style={styles.infoValue}>{value}</Text>
                            </View>
                        ) : null
                    ))}
                </View>

                {/* Test Results */}
                <View style={styles.card}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Kết quả xét nghiệm ({record.test_results?.length || 0})</Text>
                        <TouchableOpacity
                            style={styles.addTestBtn}
                            onPress={() => setShowTestModal(true)}
                        >
                            <MaterialCommunityIcons name="plus" size={16} color={COLORS.primary} />
                            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "700" }}>Thêm</Text>
                        </TouchableOpacity>
                    </View>
                    {record.test_results?.length > 0 ? (
                        record.test_results.map((t) => (
                            <View key={t.id} style={styles.testItem}>
                                <View style={styles.testHeader}>
                                    <Text style={styles.testType}>{TEST_TYPE_LABELS[t.test_type] || t.test_type}</Text>
                                    <Text style={styles.testDate}>{t.test_date}</Text>
                                </View>
                                <Text style={styles.testName}>{t.test_name}</Text>
                                <Text style={styles.testResult}>KQ: {t.result} {t.unit}</Text>
                                {t.reference_range && (
                                    <Text style={styles.testRef}>Tham chiếu: {t.reference_range}</Text>
                                )}
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>Chưa có kết quả xét nghiệm</Text>
                    )}
                </View>

                <View style={{ height: 24 }} />
            </ScrollView>
            <AddTestResultModal
                visible={showTestModal}
                onClose={() => setShowTestModal(false)}
                recordId={id}
                onSuccess={load}
            />
        </>
    );
};

const DoctorMedicalRecords = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["medical-records"]);
            setRecords(res.data.results || res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = records.filter((r) => {
        const name = (r.patient_info?.full_name || "").toLowerCase();
        const diag = (r.diagnosis || "").toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || diag.includes(q);
    });

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10 }}>
                <Searchbar
                    placeholder="Tìm theo tên bệnh nhân hoặc chẩn đoán..."
                    value={search}
                    onChangeText={setSearch}
                    style={{ backgroundColor: COLORS.bg, elevation: 0, height: 44 }}
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
                    renderItem={({ item }) => (
                        <RecordCard
                            item={item}
                            onPress={() => nav.navigate("doctor-medical-record-detail", { id: item.id })}
                        />
                    )}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                    ListEmptyComponent={
                        <View style={[Styles.center, { marginTop: 60 }]}>
                            <MaterialCommunityIcons name="file-document-outline" size={48} color={COLORS.border} />
                            <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Không có hồ sơ bệnh án</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        marginBottom: 2, elevation: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4,
    },
    cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    dateText: { fontSize: 12, color: COLORS.textMuted },
    prescBadge: { backgroundColor: COLORS.greenPale, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    prescBadgeText: { fontSize: 11, color: COLORS.green, fontWeight: "700" },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
    diagnosisLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
    diagnosisText: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
    testCount: { fontSize: 12, color: COLORS.primary, marginTop: 6 },
    // Detail styles
    sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    bigName: { fontSize: 20, fontWeight: "800", color: COLORS.text },
    subMuted: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
    infoBlock: { marginBottom: 10 },
    infoLabel: { fontSize: 12, color: COLORS.textMuted },
    infoValue: { fontSize: 14, color: COLORS.text, fontWeight: "500", marginTop: 2 },
    sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    addTestBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary },
    testItem: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, marginBottom: 8 },
    testHeader: { flexDirection: "row", justifyContent: "space-between" },
    testType: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
    testDate: { fontSize: 11, color: COLORS.textMuted },
    testName: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginTop: 2 },
    testResult: { fontSize: 13, color: COLORS.text, marginTop: 2 },
    testRef: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 10 },
    // Modal
    modalHeader: {
        backgroundColor: COLORS.primaryDark, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    input: { backgroundColor: "#fff", marginBottom: 10 },
    row: { flexDirection: "row", gap: 10 },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
    typeRow: { flexDirection: "row", gap: 8 },
    typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#fff" },
    typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    typeChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
});

export default DoctorMedicalRecords;