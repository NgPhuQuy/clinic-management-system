/**
 * screens/Staff/StaffPrescriptions.js
 * Nhân viên dược/điều dưỡng quản lý đơn thuốc:
 *   - Danh sách đơn thuốc chờ cấp phát / đã cấp
 *   - Cấp phát thuốc (trừ kho tự động FEFO)
 *   - Xem chi tiết đơn thuốc
 */
import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, ScrollView,
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const STATUS_CONFIG = {
    all:       { label: "Tất cả",       color: COLORS.textMuted },
    pending:   { label: "Chờ cấp phát", color: COLORS.orange },
    dispensed: { label: "Đã cấp phát",  color: COLORS.green },
    cancelled: { label: "Đã hủy",       color: COLORS.red },
};

const PrescriptionCard = ({ item, onDispense, onPress }) => {
    const cfg = STATUS_CONFIG[item.status] || {};
    const isPending = item.status === "pending";

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            {/* Header */}
            <View style={styles.cardTop}>
                <MaterialCommunityIcons
                    name={isPending ? "pill" : "pill-multiple"}
                    size={22}
                    color={isPending ? COLORS.orange : COLORS.green}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.patientName} numberOfLines={1}>
                        {item.patient_name || `Bệnh nhân #${item.patient}`}
                    </Text>
                    <Text style={styles.doctorName}>
                        BS. {item.doctor_name || `#${item.doctor}`}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.color + "20" }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
            </View>

            {/* Medicines summary */}
            {item.details?.length > 0 && (
                <View style={styles.medList}>
                    {item.details.slice(0, 3).map((d, i) => (
                        <View key={i} style={styles.medRow}>
                            <Text style={styles.medBullet}>•</Text>
                            <Text style={styles.medText} numberOfLines={1}>
                                {d.medicine_name} — {d.quantity} {d.medicine_unit}
                            </Text>
                        </View>
                    ))}
                    {item.details.length > 3 && (
                        <Text style={styles.moreText}>+{item.details.length - 3} loại thuốc khác</Text>
                    )}
                </View>
            )}

            {/* Footer */}
            <View style={styles.cardBottom}>
                <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString("vi-VN")}
                </Text>
                {item.total_amount > 0 && (
                    <Text style={styles.totalText}>
                        Tổng: {Number(item.total_amount).toLocaleString("vi-VN")}đ
                    </Text>
                )}
            </View>

            {/* Cấp phát button */}
            {isPending && (
                <TouchableOpacity
                    style={styles.dispenseBtn}
                    onPress={() => onDispense(item)}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="package-up" size={16} color="#fff" />
                    <Text style={styles.dispenseBtnText}>Cấp phát thuốc</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

// Detail popup - xem toàn bộ đơn thuốc
const PrescriptionDetail = ({ item, onClose, onDispense }) => {
    if (!item) return null;
    const isPending = item.status === "pending";
    return (
        <View style={styles.detailOverlay}>
            <View style={styles.detailBox}>
                <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>Đơn thuốc #{item.id}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.detailPatient}>
                    Bệnh nhân: {item.patient_name}
                </Text>
                <Text style={styles.detailDoctor}>
                    Bác sĩ: BS. {item.doctor_name}
                </Text>
                {item.notes ? (
                    <Text style={styles.detailNotes}>Ghi chú: {item.notes}</Text>
                ) : null}

                <View style={styles.divider} />

                <ScrollView style={{ maxHeight: 280 }}>
                    {item.details?.map((d) => (
                        <View key={d.id} style={styles.detailMed}>
                            <Text style={styles.detailMedName}>{d.medicine_name}</Text>
                            <View style={styles.detailMedRow}>
                                <Text style={styles.detailMedInfo}>
                                    Số lượng: {d.quantity} {d.medicine_unit}
                                </Text>
                                <Text style={styles.detailMedInfo}>
                                    {Number(d.price_at_time).toLocaleString("vi-VN")}đ/{d.medicine_unit}
                                </Text>
                            </View>
                            <Text style={styles.detailMedInfo}>
                                Liều: {d.dosage} | {d.frequency} | {d.duration_days} ngày
                            </Text>
                            {d.instructions ? (
                                <Text style={styles.detailMedInstr}>{d.instructions}</Text>
                            ) : null}
                        </View>
                    ))}
                </ScrollView>

                <View style={styles.detailTotal}>
                    <Text style={styles.detailTotalLabel}>Tổng tiền thuốc:</Text>
                    <Text style={styles.detailTotalValue}>
                        {Number(item.total_amount || 0).toLocaleString("vi-VN")}đ
                    </Text>
                </View>

                {isPending && (
                    <TouchableOpacity
                        style={styles.dispenseBtn}
                        onPress={() => { onClose(); onDispense(item); }}
                    >
                        <MaterialCommunityIcons name="package-up" size={16} color="#fff" />
                        <Text style={styles.dispenseBtnText}>Cấp phát thuốc</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const StaffPrescriptions = () => {
    const nav  = useNavigation();
    const user = useContext(MyUserContext);

    const [prescriptions, setPrescriptions] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [refreshing,    setRefreshing]    = useState(false);
    const [activeFilter,  setActiveFilter]  = useState("pending");
    const [selectedItem,  setSelectedItem]  = useState(null);
    const [dispensing,    setDispensing]    = useState(false);

    const load = async () => {
        try {
            const params = activeFilter !== "all" ? { status: activeFilter } : {};
            const res = await authApis(user.token).get(endpoints["prescriptions"], { params });
            setPrescriptions(res.data.results || res.data);
        } catch (e) {
            console.error(e?.response?.data || e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [activeFilter]);

    const dispense = (item) => {
        Alert.alert(
            "Xác nhận cấp phát thuốc",
            `Cấp phát ${item.details?.length || 0} loại thuốc cho bệnh nhân ${item.patient_name}?\n\nThao tác này sẽ tự động trừ kho theo FEFO.`,
            [
                { text: "Hủy bỏ", style: "cancel" },
                {
                    text: "Cấp phát",
                    onPress: async () => {
                        try {
                            setDispensing(true);
                            const res = await authApis(user.token).post(
                                endpoints["prescription-dispense"](item.id)
                            );
                            // Cập nhật trực tiếp trong list
                            setPrescriptions((prev) =>
                                prev.map((p) =>
                                    p.id === item.id ? { ...p, status: "dispensed" } : p
                                )
                            );
                            Alert.alert(
                                "✅ Thành công",
                                "Đã cấp phát thuốc và trừ kho thành công!\nThông báo đã gửi đến bệnh nhân."
                            );
                        } catch (e) {
                            const data = e?.response?.data;
                            const msg =
                                data?.detail ||
                                (data?.errors?.join("\n")) ||
                                "Không đủ thuốc trong kho hoặc có lỗi xảy ra!";
                            Alert.alert("❌ Lỗi cấp phát", msg);
                        } finally {
                            setDispensing(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Filter tabs */}
            <View style={styles.filterBar}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={Object.entries(STATUS_CONFIG)}
                    keyExtractor={([k]) => k}
                    renderItem={({ item: [key, cfg] }) => (
                        <TouchableOpacity
                            style={[
                                styles.chip,
                                activeFilter === key && {
                                    backgroundColor: cfg.color,
                                    borderColor: cfg.color,
                                },
                            ]}
                            onPress={() => setActiveFilter(key)}
                        >
                            <Text style={[styles.chipText, activeFilter === key && { color: "#fff" }]}>
                                {cfg.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
                />
            </View>

            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={prescriptions}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <PrescriptionCard
                            item={item}
                            onDispense={dispense}
                            onPress={() => setSelectedItem(item)}
                        />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(); }}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={[Styles.center, { marginTop: 60 }]}>
                            <MaterialCommunityIcons name="pill-off" size={52} color={COLORS.border} />
                            <Text style={styles.emptyText}>
                                {activeFilter === "pending"
                                    ? "Không có đơn thuốc chờ cấp phát"
                                    : "Không có đơn thuốc nào"}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
                />
            )}

            {/* Detail overlay */}
            {selectedItem && (
                <PrescriptionDetail
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onDispense={dispense}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    filterBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
    chip: {
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: COLORS.border, backgroundColor: "#fff",
    },
    chipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardTop:     { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    doctorName:  { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText:  { fontSize: 11, fontWeight: "700" },
    medList:     { backgroundColor: COLORS.bg, borderRadius: 8, padding: 10, marginBottom: 8 },
    medRow:      { flexDirection: "row", alignItems: "flex-start", gap: 4, marginBottom: 3 },
    medBullet:   { color: COLORS.primary, fontWeight: "700" },
    medText:     { fontSize: 13, color: COLORS.text, flex: 1 },
    moreText:    { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },
    cardBottom:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    dateText:    { fontSize: 12, color: COLORS.textMuted },
    totalText:   { fontSize: 13, fontWeight: "700", color: COLORS.primary },
    dispenseBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: COLORS.green,
        borderRadius: 10, paddingVertical: 10,
    },
    dispenseBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    emptyText: { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
    // Detail overlay
    detailOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    detailBox: {
        backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, maxHeight: "85%",
    },
    detailHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    detailTitle:   { fontSize: 17, fontWeight: "800", color: COLORS.text },
    detailPatient: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
    detailDoctor:  { fontSize: 13, color: COLORS.textMuted, marginBottom: 2 },
    detailNotes:   { fontSize: 13, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 8 },
    divider:       { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
    detailMed:     { padding: 10, backgroundColor: COLORS.bg, borderRadius: 10, marginBottom: 8 },
    detailMedName: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
    detailMedRow:  { flexDirection: "row", justifyContent: "space-between" },
    detailMedInfo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    detailMedInstr: { fontSize: 12, color: COLORS.primary, marginTop: 4, fontStyle: "italic" },
    detailTotal:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, marginBottom: 12 },
    detailTotalLabel: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
    detailTotalValue: { fontSize: 18, fontWeight: "800", color: COLORS.primary },
});

export default StaffPrescriptions;