import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, medicalRecordsStyles as S } from "../../styles/Styles";

// ─── Medical Records List ─────────────────────────────────────────────────────
export const MedicalRecords = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApis(user.token).get(endpoints["medical-records"])
            .then(r => setRecords(r.data.results || r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={Styles.container}>
            {records.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <MaterialCommunityIcons name="file-document-outline" size={64} color={COLORS.textLight} />
                    <Text style={{ marginTop: 12, color: COLORS.textMuted, fontWeight: "600" }}>Chưa có hồ sơ bệnh án</Text>
                </View>
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={mrStyles.card}
                            onPress={() => nav.navigate("medical-record-detail", { id: item.id })}
                            activeOpacity={0.8}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <View style={mrStyles.iconWrap}>
                                    <MaterialCommunityIcons name="file-document-outline" size={22} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={mrStyles.date}>
                                        {new Date(item.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                    </Text>
                                    <Text style={mrStyles.diagnosis} numberOfLines={1}>
                                        {item.diagnosis || "Chưa có chẩn đoán"}
                                    </Text>
                                    <Text style={mrStyles.doctor}>
                                        BS. {item.doctor_info?.full_name || `#${item.doctor}`}
                                    </Text>
                                </View>
                                {item.test_results?.length > 0 && (
                                    <View style={mrStyles.testBadge}>
                                        <MaterialCommunityIcons name="test-tube" size={11} color={COLORS.primary} />
                                        <Text style={mrStyles.testBadgeText}>{item.test_results.length} XN</Text>
                                    </View>
                                )}
                                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

// ─── Medical Record Detail ────────────────────────────────────────────────────
export const MedicalRecordDetail = () => {
    const route = useRoute();
    const user  = useContext(MyUserContext);
    const { id } = route.params;
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApis(user.token).get(endpoints["medical-record-detail"](id))
            .then(r => setRecord(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    if (!record)  return <View style={[Styles.center, { flex: 1 }]}><Text>Không tìm thấy hồ sơ</Text></View>;

    const rows = [
        { label: "Bác sĩ",          value: record.doctor_info?.full_name || `#${record.doctor}` },
        { label: "Triệu chứng",      value: record.symptoms },
        { label: "Chẩn đoán",        value: record.diagnosis },
        { label: "Hướng điều trị",   value: record.treatment_notes },
        { label: "Ngày tái khám",    value: record.follow_up_date
            ? new Date(record.follow_up_date + "T00:00:00").toLocaleDateString("vi-VN")
            : null },
    ];

    return (
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {/* Header */}
            <View style={mrStyles.detailHeader}>
                <MaterialCommunityIcons name="file-document" size={28} color={COLORS.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={mrStyles.detailTitle}>Hồ sơ bệnh án #{record.id}</Text>
                    <Text style={mrStyles.detailDate}>
                        {new Date(record.created_at).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                    </Text>
                </View>
            </View>

            {/* Info rows */}
            <View style={mrStyles.infoCard}>
                {rows.filter(r => r.value).map(({ label, value }, i, arr) => (
                    <View key={label} style={[mrStyles.infoRow, i < arr.length - 1 && mrStyles.infoRowBorder]}>
                        <Text style={mrStyles.infoLabel}>{label}</Text>
                        <Text style={mrStyles.infoValue}>{value}</Text>
                    </View>
                ))}
            </View>

            {/* Test results */}
            {record.test_results?.length > 0 && (
                <View style={mrStyles.infoCard}>
                    <Text style={mrStyles.sectionTitle}>Kết quả xét nghiệm ({record.test_results.length})</Text>
                    {record.test_results.map((t, i) => (
                        <View key={t.id ?? i} style={[mrStyles.testItem, i > 0 && mrStyles.testItemBorder]}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <Text style={mrStyles.testName}>{t.test_name}</Text>
                                <View style={[mrStyles.statusChip, { backgroundColor: t.status === "completed" ? COLORS.green + "22" : COLORS.orange + "22" }]}>
                                    <Text style={[mrStyles.statusChipText, { color: t.status === "completed" ? COLORS.green : COLORS.orange }]}>
                                        {t.status === "completed" ? "Có kết quả" : "Chờ kết quả"}
                                    </Text>
                                </View>
                            </View>
                            {t.test_date && <Text style={mrStyles.testMeta}>Ngày XN: {new Date(t.test_date).toLocaleDateString("vi-VN")}</Text>}
                            {t.result ? (
                                <>
                                    <Text style={mrStyles.testResult}>Kết quả: {t.result} {t.unit || ""}</Text>
                                    {t.reference_range && <Text style={mrStyles.testRef}>Tham chiếu: {t.reference_range}</Text>}
                                </>
                            ) : (
                                <Text style={mrStyles.testPending}>Đang chờ kết quả từ phòng xét nghiệm</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            <View style={{ height: 16 }} />
        </ScrollView>
    );
};

// ─── Test Results (patient) ───────────────────────────────────────────────────
export const TestResults = () => {
    const user = useContext(MyUserContext);
    const [items, setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        authApis(user.token).get(endpoints["medical-records"])
            .then(r => {
                const records = r.data.results || r.data;
                const flat = records.flatMap(rec =>
                    (rec.test_results || []).map(t => ({
                        ...t,
                        recordDate: rec.created_at,
                        doctorName: rec.doctor_info?.full_name || `#${rec.doctor}`,
                    }))
                );
                setItems(flat);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const FILTERS = [
        { key: "all",       label: "Tất cả" },
        { key: "completed", label: "Có kết quả" },
        { key: "ordered",   label: "Chờ kết quả" },
    ];
    const displayed = filter === "all" ? items : items.filter(t => t.status === filter);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            {/* Filter chips */}
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        style={[mrStyles.chip, filter === f.key && mrStyles.chipActive]}
                    >
                        <Text style={[mrStyles.chipText, filter === f.key && mrStyles.chipTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {displayed.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <MaterialCommunityIcons name="test-tube-empty" size={64} color={COLORS.textLight} />
                    <Text style={{ marginTop: 12, color: COLORS.textMuted, fontWeight: "600" }}>Chưa có kết quả xét nghiệm</Text>
                </View>
            ) : (
                <FlatList
                    data={displayed}
                    keyExtractor={(_, i) => String(i)}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    renderItem={({ item }) => (
                        <View style={mrStyles.testCard}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                <Text style={mrStyles.testName}>{item.test_name}</Text>
                                <View style={[mrStyles.statusChip, { backgroundColor: item.status === "completed" ? COLORS.green + "22" : COLORS.orange + "22" }]}>
                                    <Text style={[mrStyles.statusChipText, { color: item.status === "completed" ? COLORS.green : COLORS.orange }]}>
                                        {item.status === "completed" ? "Có kết quả" : "Chờ kết quả"}
                                    </Text>
                                </View>
                            </View>
                            <Text style={mrStyles.testMeta}>BS. {item.doctorName} · {new Date(item.recordDate).toLocaleDateString("vi-VN")}</Text>
                            {item.test_date && <Text style={mrStyles.testMeta}>Ngày XN: {new Date(item.test_date).toLocaleDateString("vi-VN")}</Text>}
                            {item.result ? (
                                <View style={mrStyles.resultBox}>
                                    <Text style={mrStyles.testResult}>{item.result} {item.unit || ""}</Text>
                                    {item.reference_range && <Text style={mrStyles.testRef}>Tham chiếu: {item.reference_range}</Text>}
                                </View>
                            ) : (
                                <Text style={[mrStyles.testPending, { marginTop: 6 }]}>Đang chờ kết quả từ phòng xét nghiệm</Text>
                            )}
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const mrStyles = StyleSheet.create({
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primaryPale, alignItems: "center", justifyContent: "center" },
    date:      { fontSize: 12, color: COLORS.textMuted },
    diagnosis: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginTop: 2 },
    doctor:    { fontSize: 12, color: COLORS.primary, marginTop: 1 },
    testBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.primaryPale, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
    testBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.primary },

    detailHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 2 },
    detailTitle:  { fontSize: 16, fontWeight: "800", color: COLORS.text },
    detailDate:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

    infoCard:      { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2 },
    infoRow:       { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12 },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
    infoLabel:     { width: 130, fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
    infoValue:     { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: "500" },
    sectionTitle:  { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

    testItem:       { paddingHorizontal: 16, paddingBottom: 12 },
    testItemBorder: { borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 12, marginTop: 0 },
    testName:       { fontSize: 14, fontWeight: "700", color: COLORS.text, flex: 1 },
    testMeta:       { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    testResult:     { fontSize: 14, fontWeight: "600", color: COLORS.text, marginTop: 4 },
    testRef:        { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    testPending:    { fontSize: 12, color: COLORS.orange, fontStyle: "italic" },
    statusChip:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
    statusChipText: { fontSize: 11, fontWeight: "700" },
    resultBox:      { backgroundColor: COLORS.bg, borderRadius: 8, padding: 10, marginTop: 6 },

    testCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },

    chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#e0e0e0", backgroundColor: "#fff" },
    chipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText:      { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
    chipTextActive:{ color: "#fff" },
});

export default MedicalRecords;
