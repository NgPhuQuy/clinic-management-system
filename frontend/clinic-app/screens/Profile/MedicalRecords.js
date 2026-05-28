import { View, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";
import { medicalRecordsStyles as mrStyles, testResultsStyles as trStyles } from "./Styles";

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

export const MedicalRecordDetail = () => {
    const route = useRoute();
    const user = useContext(MyUserContext);
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
    if (!record) return <View style={[Styles.center, { flex: 1 }]}><Text>Không tìm thấy hồ sơ</Text></View>;

    const rows = [
        { label: "Bác sĩ", value: record.doctor_info?.full_name || `#${record.doctor}` },
        { label: "Triệu chứng", value: record.symptoms },
        { label: "Chẩn đoán", value: record.diagnosis },
        { label: "Hướng điều trị", value: record.treatment_notes },
        {
            label: "Ngày tái khám", value: record.follow_up_date
                ? new Date(record.follow_up_date + "T00:00:00").toLocaleDateString("vi-VN")
                : null
        },
    ];

    return (
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            <View style={mrStyles.detailHeader}>
                <MaterialCommunityIcons name="file-document" size={28} color={COLORS.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={mrStyles.detailTitle}>Hồ sơ bệnh án #{record.id}</Text>
                    <Text style={mrStyles.detailDate}>
                        {new Date(record.created_at).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                    </Text>
                </View>
            </View>

            <View style={mrStyles.infoCard}>
                {rows.filter(r => r.value).map(({ label, value }, i, arr) => (
                    <View key={label} style={[mrStyles.infoRow, i < arr.length - 1 && mrStyles.infoRowBorder]}>
                        <Text style={mrStyles.infoLabel}>{label}</Text>
                        <Text style={mrStyles.infoValue}>{value}</Text>
                    </View>
                ))}
            </View>

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

export const TestResults = () => {
    const user = useContext(MyUserContext);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("all");

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await authApis(user.token).get(endpoints["test-results"]);
            setItems(res.data.results || res.data);
        } catch (e) {
            console.error("TestResults load:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const FILTERS = [
        { key: "all", label: "Tất cả", icon: "test-tube" },
        { key: "completed", label: "Có kết quả", icon: "check-circle-outline" },
        { key: "ordered", label: "Chờ kết quả", icon: "clock-outline" },
    ];
    const displayed = filter === "all" ? items : items.filter(t => t.status === filter);

    if (loading) {
        return (
            <View style={[Styles.center, { flex: 1 }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <View style={trStyles.filterRow}>
                {FILTERS.map(f => {
                    const count = f.key === "all" ? items.length : items.filter(t => t.status === f.key).length;
                    const active = filter === f.key;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            style={[trStyles.chip, active && trStyles.chipActive]}
                            onPress={() => setFilter(f.key)}
                        >
                            <MaterialCommunityIcons
                                name={f.icon}
                                size={14}
                                color={active ? "#fff" : COLORS.textMuted}
                            />
                            <Text style={[trStyles.chipText, active && trStyles.chipTextActive]}>
                                {f.label}
                            </Text>
                            <View style={[trStyles.chipBadge, active && trStyles.chipBadgeActive]}>
                                <Text style={[trStyles.chipBadgeText, active && { color: COLORS.primary }]}>
                                    {count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {displayed.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <MaterialCommunityIcons name="test-tube-empty" size={64} color={COLORS.textLight} />
                    <Text style={{ marginTop: 12, color: COLORS.textMuted, fontWeight: "600" }}>
                        {filter === "completed" ? "Chưa có xét nghiệm có kết quả"
                            : filter === "ordered" ? "Không có xét nghiệm đang chờ"
                                : "Chưa có kết quả xét nghiệm nào"}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={displayed}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(true); }}
                            colors={[COLORS.primary]}
                        />
                    }
                    renderItem={({ item }) => {
                        const isDone = item.status === "completed";
                        return (
                            <View style={trStyles.card}>
                                <View style={trStyles.cardHeader}>
                                    <View style={trStyles.typeTag}>
                                        <MaterialCommunityIcons
                                            name={TEST_TYPE_ICONS[item.test_type] || "test-tube"}
                                            size={13}
                                            color={COLORS.primary}
                                        />
                                        <Text style={trStyles.typeText}>
                                            {TEST_TYPE_LABELS[item.test_type] || item.test_type}
                                        </Text>
                                    </View>
                                    <View style={[trStyles.statusBadge, isDone ? trStyles.statusDone : trStyles.statusPending]}>
                                        <MaterialCommunityIcons
                                            name={isDone ? "check-circle" : "clock-outline"}
                                            size={12}
                                            color={isDone ? COLORS.green : COLORS.orange}
                                        />
                                        <Text style={[trStyles.statusText, { color: isDone ? COLORS.green : COLORS.orange }]}>
                                            {isDone ? "Có kết quả" : "Chờ kết quả"}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={trStyles.testName}>{item.test_name}</Text>

                                <View style={trStyles.metaRow}>
                                    {item.doctor_name ? (
                                        <View style={trStyles.metaItem}>
                                            <MaterialCommunityIcons name="doctor" size={12} color={COLORS.textMuted} />
                                            <Text style={trStyles.metaText}>BS. {item.doctor_name}</Text>
                                        </View>
                                    ) : null}
                                    {item.test_date ? (
                                        <View style={trStyles.metaItem}>
                                            <MaterialCommunityIcons name="calendar" size={12} color={COLORS.textMuted} />
                                            <Text style={trStyles.metaText}>
                                                {new Date(item.test_date).toLocaleDateString("vi-VN")}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                {isDone ? (
                                    <View style={trStyles.resultBox}>
                                        <Text style={trStyles.resultLabel}>Kết quả</Text>
                                        <Text style={trStyles.resultValue}>
                                            {item.result}{item.unit ? ` ${item.unit}` : ""}
                                        </Text>
                                        {item.reference_range ? (
                                            <Text style={trStyles.refText}>
                                                Tham chiếu: {item.reference_range}
                                            </Text>
                                        ) : null}
                                    </View>
                                ) : (
                                    <View style={trStyles.pendingBox}>
                                        <MaterialCommunityIcons name="clock-sand" size={14} color={COLORS.orange} />
                                        <Text style={trStyles.pendingText}>Đang chờ kết quả từ phòng xét nghiệm</Text>
                                    </View>
                                )}
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
};


export default MedicalRecords;
