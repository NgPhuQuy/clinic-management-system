import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, ScrollView, Modal,
} from "react-native";
import { Text, TextInput, Button, HelperText, Searchbar } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

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

const RecordCard = ({ item, onPress }) => {
    const ordered = item.test_results?.filter(t => t.status === "ordered").length || 0;
    const total = item.test_results?.length || 0;
    return (
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
            {total > 0 && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                    <View style={styles.testCountBadge}>
                        <MaterialCommunityIcons name="test-tube" size={11} color={COLORS.primary} />
                        <Text style={styles.testCountText}>{total} xét nghiệm</Text>
                    </View>
                    {ordered > 0 && (
                        <View style={[styles.testCountBadge, { backgroundColor: COLORS.orangePale, borderColor: COLORS.orange }]}>
                            <MaterialCommunityIcons name="clock-outline" size={11} color={COLORS.orange} />
                            <Text style={[styles.testCountText, { color: COLORS.orange }]}>{ordered} chờ kết quả</Text>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

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
                            <Text style={styles.fillTitle}>Nhập kết quả</Text>
                            <Text style={styles.fillSubtitle}>{test.test_name}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={22} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.typeTag, { alignSelf: "flex-start", marginBottom: 12 }]}>
                        <MaterialCommunityIcons name={TEST_TYPE_ICONS[test.test_type] || "test-tube"} size={13} color={COLORS.primary} />
                        <Text style={styles.typeTagText}>{TEST_TYPE_LABELS[test.test_type] || test.test_type}</Text>
                    </View>
                    <HelperText type="error" visible={!!err}>{err}</HelperText>
                    <TextInput
                        label="Kết quả *" value={form.result}
                        onChangeText={(t) => setForm({ ...form, result: t })}
                        mode="outlined" multiline numberOfLines={3} style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
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
                    <TextInput
                        label="Ngày xét nghiệm" value={form.test_date}
                        onChangeText={(t) => setForm({ ...form, test_date: t })}
                        mode="outlined" style={styles.input}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                    <Button mode="contained" onPress={save} loading={saving}
                        style={{ borderRadius: 10 }} buttonColor={COLORS.green}>
                        Xác nhận kết quả
                    </Button>
                </View>
            </View>
        </Modal>
    );
};

const AddTestResultModal = ({ visible, onClose, recordId, onSuccess }) => {
    const user = useContext(MyUserContext);
    const [mode, setMode] = useState("order");
    const [form, setForm] = useState({
        test_type: "blood", test_name: "", result: "",
        unit: "", reference_range: "", test_date: TODAY,
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (visible) {
            setMode("order");
            setForm({ test_type: "blood", test_name: "", result: "", unit: "", reference_range: "", test_date: TODAY });
            setErr(null);
        }
    }, [visible]);

    const testTypes = Object.entries(TEST_TYPE_LABELS);

    const save = async () => {
        if (!form.test_name.trim()) { setErr("Vui lòng nhập tên xét nghiệm!"); return; }
        if (mode === "full" && !form.result.trim()) { setErr("Vui lòng nhập kết quả!"); return; }
        try {
            setSaving(true); setErr(null);
            const payload = {
                ...form,
                result: mode === "order" ? "" : form.result,
                status: mode === "order" ? "ordered" : "completed",
            };
            await authApis(user.token).post(endpoints["medical-record-add-test"](recordId), payload);
            onSuccess();
            onClose();
        } catch (e) {
            setErr(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || "Lỗi lưu!");
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
                <Text style={styles.modalTitle}>Thêm xét nghiệm</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.modeRow}>
                <TouchableOpacity
                    style={[styles.modeBtn, mode === "order" && styles.modeBtnActive]}
                    onPress={() => setMode("order")}
                >
                    <MaterialCommunityIcons name="clipboard-plus-outline" size={16}
                        color={mode === "order" ? "#fff" : COLORS.textMuted} />
                    <Text style={[styles.modeBtnText, mode === "order" && { color: "#fff" }]}>Chỉ định</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeBtn, mode === "full" && styles.modeBtnActive]}
                    onPress={() => setMode("full")}
                >
                    <MaterialCommunityIcons name="clipboard-check-outline" size={16}
                        color={mode === "full" ? "#fff" : COLORS.textMuted} />
                    <Text style={[styles.modeBtnText, mode === "full" && { color: "#fff" }]}>Nhập kết quả ngay</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                {mode === "order" ? (
                    <View style={styles.hintBox}>
                        <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.hintText}>Chỉ định xét nghiệm, staff/bác sĩ sẽ nhập kết quả sau.</Text>
                    </View>
                ) : (
                    <View style={[styles.hintBox, { backgroundColor: COLORS.greenPale, borderColor: COLORS.green }]}>
                        <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.green} />
                        <Text style={[styles.hintText, { color: COLORS.green }]}>Nhập đầy đủ thông tin và kết quả.</Text>
                    </View>
                )}

                <HelperText type="error" visible={!!err}>{err}</HelperText>

                <Text style={styles.fieldLabel}>Loại xét nghiệm</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        {testTypes.map(([key, label]) => (
                            <TouchableOpacity
                                key={key}
                                style={[styles.typeChip, form.test_type === key && styles.typeChipActive]}
                                onPress={() => setForm({ ...form, test_type: key })}
                            >
                                <MaterialCommunityIcons
                                    name={TEST_TYPE_ICONS[key] || "test-tube"} size={13}
                                    color={form.test_type === key ? "#fff" : COLORS.textMuted}
                                />
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
                    placeholder="VD: Công thức máu toàn phần, Glucose máu..."
                />

                {mode === "full" && (
                    <>
                        <TextInput
                            label="Kết quả *" value={form.result}
                            onChangeText={(t) => setForm({ ...form, result: t })}
                            mode="outlined" multiline numberOfLines={3} style={styles.input}
                            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
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
                    </>
                )}

                <TextInput
                    label="Ngày xét nghiệm" value={form.test_date}
                    onChangeText={(t) => setForm({ ...form, test_date: t })}
                    mode="outlined" style={styles.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    left={<TextInput.Icon icon="calendar" />}
                />

                <Button
                    mode="contained" onPress={save} loading={saving}
                    style={{ borderRadius: 10 }}
                    buttonColor={mode === "order" ? COLORS.primary : COLORS.green}
                >
                    {mode === "order" ? "Chỉ định xét nghiệm" : "Lưu kết quả"}
                </Button>
            </ScrollView>
        </Modal>
    );
};

export const DoctorMedicalRecordDetail = () => {
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { id } = route.params;
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTestModal, setShowTestModal] = useState(false);
    const [fillTarget, setFillTarget] = useState(null);

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
                <View style={[styles.card, { margin: 12, marginBottom: 6 }]}>
                    <Text style={styles.sectionTitle}>Bệnh nhân</Text>
                    <Text style={styles.bigName}>{record.patient_info?.full_name}</Text>
                    <Text style={styles.subMuted}>{new Date(record.created_at).toLocaleDateString("vi-VN")}</Text>
                </View>

                <View style={[styles.card, { margin: 12, marginVertical: 6 }]}>
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

                <View style={[styles.card, { margin: 12, marginVertical: 6 }]}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>
                            Cận lâm sàng ({record.test_results?.length || 0})
                        </Text>
                        <TouchableOpacity style={styles.addTestBtn} onPress={() => setShowTestModal(true)}>
                            <MaterialCommunityIcons name="plus" size={16} color={COLORS.primary} />
                            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "700" }}>Thêm</Text>
                        </TouchableOpacity>
                    </View>
                    {record.test_results?.length > 0 ? (
                        record.test_results.map((t) => (
                            <View key={t.id} style={styles.testItem}>
                                <View style={styles.testHeader}>
                                    <View style={styles.typeTag}>
                                        <MaterialCommunityIcons
                                            name={TEST_TYPE_ICONS[t.test_type] || "test-tube"}
                                            size={12} color={COLORS.primary}
                                        />
                                        <Text style={styles.typeTagText}>{TEST_TYPE_LABELS[t.test_type] || t.test_type}</Text>
                                    </View>
                                    <View style={[
                                        styles.statusBadge,
                                        t.status === "completed"
                                            ? { backgroundColor: COLORS.greenPale, borderColor: COLORS.green }
                                            : { backgroundColor: COLORS.orangePale, borderColor: COLORS.orange }
                                    ]}>
                                        <Text style={[
                                            styles.statusBadgeText,
                                            { color: t.status === "completed" ? COLORS.green : COLORS.orange }
                                        ]}>
                                            {t.status === "completed" ? "Có kết quả" : "Chờ kết quả"}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.testName}>{t.test_name}</Text>
                                <Text style={styles.testDate}>{t.test_date}</Text>
                                {t.status === "completed" ? (
                                    <>
                                        <Text style={styles.testResult}>KQ: {t.result} {t.unit}</Text>
                                        {t.reference_range ? (
                                            <Text style={styles.testRef}>Tham chiếu: {t.reference_range}</Text>
                                        ) : null}
                                    </>
                                ) : (
                                    <TouchableOpacity style={styles.fillBtn} onPress={() => setFillTarget(t)}>
                                        <MaterialCommunityIcons name="pencil-outline" size={14} color={COLORS.primary} />
                                        <Text style={styles.fillBtnText}>Nhập kết quả</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>Chưa có xét nghiệm nào</Text>
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
            <FillResultModal
                visible={!!fillTarget}
                test={fillTarget}
                onClose={() => setFillTarget(null)}
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
        elevation: 2,
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
    testCountBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: COLORS.primaryPale, borderRadius: 6,
        paddingHorizontal: 7, paddingVertical: 3,
        borderWidth: 1, borderColor: COLORS.primaryMid,
    },
    testCountText: { fontSize: 11, color: COLORS.primary, fontWeight: "600" },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    bigName: { fontSize: 20, fontWeight: "800", color: COLORS.text },
    subMuted: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
    infoBlock: { marginBottom: 10 },
    infoLabel: { fontSize: 12, color: COLORS.textMuted },
    infoValue: { fontSize: 14, color: COLORS.text, fontWeight: "500", marginTop: 2 },
    sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    addTestBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary },
    testItem: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, marginBottom: 8 },
    testHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    typeTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.primaryPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeTagText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    statusBadgeText: { fontSize: 11, fontWeight: "700" },
    testName: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginTop: 2 },
    testDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
    testResult: { fontSize: 13, color: COLORS.text, marginTop: 4 },
    testRef: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    fillBtn: {
        flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
        alignSelf: "flex-start",
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
        borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.primaryPale,
    },
    fillBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
    emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 10 },
    modalHeader: {
        backgroundColor: COLORS.primaryDark, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    modeRow: {
        flexDirection: "row", backgroundColor: "#fff",
        paddingHorizontal: 16, paddingVertical: 10, gap: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    modeBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    },
    modeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    modeBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
    input: { backgroundColor: "#fff", marginBottom: 10 },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
    typeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#fff" },
    typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    typeChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    hintBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: COLORS.primaryPale, borderRadius: 8,
        padding: 10, marginBottom: 12,
        borderWidth: 1, borderColor: COLORS.primaryMid,
    },
    hintText: { flex: 1, fontSize: 12, color: COLORS.primary, fontWeight: "500" },
    fillOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    fillSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    fillHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    fillTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    fillSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
});

export default DoctorMedicalRecords;
