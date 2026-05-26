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
import Styles, { COLORS, doctorMedicalRecordsStyles as S } from "../../styles/Styles";

const TEST_TYPE_LABELS = {
    blood: "Xét nghiệm máu", urine: "Xét nghiệm nước tiểu", stool: "Xét nghiệm phân",
    micro: "Vi sinh / Cấy khuẩn", xray: "Chụp X-quang", ct: "Chụp CT",
    mri: "Chụp MRI", ultrasound: "Siêu âm", endoscopy: "Nội soi",
    ecg: "Điện tâm đồ (ECG)", other: "Khác",
};

const RecordCard = ({ item, onPress }) => (
    <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.8}>
        <View style={S.cardTop}>
            <MaterialCommunityIcons name="file-document-outline" size={22} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={S.patientName} numberOfLines={1}>
                    {item.patient_info?.full_name || `Bệnh nhân #${item.patient}`}
                </Text>
                <Text style={S.dateText}>
                    {new Date(item.created_at).toLocaleDateString("vi-VN")}
                </Text>
            </View>
            {item.prescription && (
                <View style={S.prescBadge}>
                    <Text style={S.prescBadgeText}>Có đơn thuốc</Text>
                </View>
            )}
        </View>
        <View style={S.divider} />
        <Text style={S.diagnosisLabel}>Chẩn đoán:</Text>
        <Text style={S.diagnosisText} numberOfLines={2}>{item.diagnosis}</Text>
        {item.test_results?.length > 0 && (
            <Text style={S.testCount}>
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
            <View style={S.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={S.modalTitle}>Thêm kết quả xét nghiệm</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                <Text style={S.fieldLabel}>Loại xét nghiệm</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={S.typeRow}>
                        {testTypes.map(([key, label]) => (
                            <TouchableOpacity
                                key={key}
                                style={[S.typeChip, form.test_type === key && S.typeChipActive]}
                                onPress={() => setForm({ ...form, test_type: key })}
                            >
                                <Text style={[S.typeChipText, form.test_type === key && { color: "#fff" }]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                <TextInput
                    label="Tên xét nghiệm *" value={form.test_name}
                    onChangeText={(t) => setForm({ ...form, test_name: t })}
                    mode="outlined" style={S.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <TextInput
                    label="Kết quả *" value={form.result}
                    onChangeText={(t) => setForm({ ...form, result: t })}
                    mode="outlined" multiline numberOfLines={3} style={S.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <View style={S.row}>
                    <TextInput
                        label="Đơn vị" value={form.unit}
                        onChangeText={(t) => setForm({ ...form, unit: t })}
                        mode="outlined" style={[S.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                    <TextInput
                        label="Khoảng tham chiếu" value={form.reference_range}
                        onChangeText={(t) => setForm({ ...form, reference_range: t })}
                        mode="outlined" style={[S.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                </View>
                <TextInput
                    label="Ngày xét nghiệm (YYYY-MM-DD) *" value={form.test_date}
                    onChangeText={(t) => setForm({ ...form, test_date: t })}
                    mode="outlined" placeholder="2025-01-15" style={S.input}
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
                <View style={S.card}>
                    <Text style={S.sectionTitle}>Bệnh nhân</Text>
                    <Text style={S.bigName}>{record.patient_info?.full_name}</Text>
                    <Text style={S.subMuted}>{new Date(record.created_at).toLocaleDateString("vi-VN")}</Text>
                </View>

                {/* Medical Info */}
                <View style={S.card}>
                    <Text style={S.sectionTitle}>Thông tin bệnh án</Text>
                    {[
                        { label: "Triệu chứng", value: record.symptoms },
                        { label: "Chẩn đoán", value: record.diagnosis },
                        { label: "Hướng điều trị", value: record.treatment_notes },
                        { label: "Ngày tái khám", value: record.follow_up_date },
                    ].map(({ label, value }) => (
                        value ? (
                            <View key={label} style={S.infoBlock}>
                                <Text style={S.infoLabel}>{label}</Text>
                                <Text style={S.infoValue}>{value}</Text>
                            </View>
                        ) : null
                    ))}
                </View>

                {/* Test Results */}
                <View style={S.card}>
                    <View style={S.sectionHeaderRow}>
                        <Text style={S.sectionTitle}>Kết quả xét nghiệm ({record.test_results?.length || 0})</Text>
                        <TouchableOpacity
                            style={S.addTestBtn}
                            onPress={() => setShowTestModal(true)}
                        >
                            <MaterialCommunityIcons name="plus" size={16} color={COLORS.primary} />
                            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "700" }}>Thêm</Text>
                        </TouchableOpacity>
                    </View>
                    {record.test_results?.length > 0 ? (
                        record.test_results.map((t) => (
                            <View key={t.id} style={S.testItem}>
                                <View style={S.testHeader}>
                                    <Text style={S.testType}>{TEST_TYPE_LABELS[t.test_type] || t.test_type}</Text>
                                    <Text style={S.testDate}>{t.test_date}</Text>
                                </View>
                                <Text style={S.testName}>{t.test_name}</Text>
                                <Text style={S.testResult}>KQ: {t.result} {t.unit}</Text>
                                {t.reference_range && (
                                    <Text style={S.testRef}>Tham chiếu: {t.reference_range}</Text>
                                )}
                            </View>
                        ))
                    ) : (
                        <Text style={S.emptyText}>Chưa có kết quả xét nghiệm</Text>
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
export default DoctorMedicalRecordDetail;