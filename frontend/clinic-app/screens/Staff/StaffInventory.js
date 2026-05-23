/**
 * screens/Staff/StaffInventory.js
 * Nhân viên dược/kho quản lý tồn kho thuốc:
 *   - Xem tồn kho toàn bộ
 *   - Xem thuốc sắp hết / sắp hết hạn
 *   - Xem và giải quyết cảnh báo kho
 *   - Nhập kho mới (thêm lô)
 */
import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, ScrollView, Modal,
} from "react-native";
import { Text, Button, TextInput, HelperText } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const TAB_CONFIG = [
    { key: "all",        label: "Tất cả",      icon: "package-variant"     },
    { key: "low_stock",  label: "Sắp hết",     icon: "package-variant-closed" },
    { key: "near_expiry",label: "Sắp hết hạn", icon: "calendar-alert"     },
    { key: "alerts",     label: "Cảnh báo",    icon: "alert-circle-outline" },
];

const ALERT_TYPE_COLORS = {
    low_stock:   COLORS.orange,
    near_expiry: COLORS.purple,
    expired:     COLORS.red,
};
const ALERT_TYPE_LABELS = {
    low_stock:   "Sắp hết hàng",
    near_expiry: "Sắp hết hạn",
    expired:     "Đã hết hạn",
};

const InventoryCard = ({ item }) => {
    const isLow    = item.quantity <= item.warning_threshold;
    const today    = new Date();
    const expiry   = new Date(item.expiry_date);
    const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    const isNearExpiry = daysLeft <= 30 && daysLeft > 0;
    const isExpired    = daysLeft <= 0;

    let borderColor = COLORS.border;
    if (isExpired)    borderColor = COLORS.red;
    else if (isLow)   borderColor = COLORS.orange;
    else if (isNearExpiry) borderColor = COLORS.purple;

    return (
        <View style={[styles.card, { borderLeftColor: borderColor, borderLeftWidth: 4 }]}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.medicineName} numberOfLines={1}>
                        {item.medicine?.name || `Thuốc #${item.medicine}`}
                    </Text>
                    <Text style={styles.medicineCode}>
                        Lô: {item.batch_number} • {item.medicine?.unit || ""}
                    </Text>
                </View>
                <View style={[
                    styles.qtyBadge,
                    {
                        backgroundColor: isLow ? COLORS.orangePale : COLORS.greenPale,
                    }
                ]}>
                    <Text style={[
                        styles.qtyText,
                        { color: isLow ? COLORS.orange : COLORS.green }
                    ]}>
                        {item.quantity}
                    </Text>
                    <Text style={styles.qtyLabel}>còn lại</Text>
                </View>
            </View>

            <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-range" size={13} color={COLORS.textMuted} />
                <Text style={styles.infoText}>
                    Hạn: {new Date(item.expiry_date).toLocaleDateString("vi-VN")}
                    {isExpired    && " — ⛔ ĐÃ HẾT HẠN"}
                    {isNearExpiry && ` — ⚠️ còn ${daysLeft} ngày`}
                </Text>
            </View>

            <View style={styles.infoRow}>
                <MaterialCommunityIcons name="alert-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.infoText}>
                    Ngưỡng cảnh báo: {item.warning_threshold} | Nhà cung cấp: {item.supplier || "—"}
                </Text>
            </View>

            {(isLow || isNearExpiry || isExpired) && (
                <View style={[styles.warningBadge, { backgroundColor: borderColor + "15" }]}>
                    <MaterialCommunityIcons name="alert" size={13} color={borderColor} />
                    <Text style={[styles.warningText, { color: borderColor }]}>
                        {isExpired    ? "Đã hết hạn — cần xử lý ngay!"    :
                         isLow        ? `Tồn kho thấp (ngưỡng: ${item.warning_threshold})` :
                         isNearExpiry ? `Sắp hết hạn trong ${daysLeft} ngày` : ""}
                    </Text>
                </View>
            )}
        </View>
    );
};

const AlertCard = ({ item, onResolve }) => {
    const color = ALERT_TYPE_COLORS[item.alert_type] || COLORS.textMuted;
    return (
        <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
            <View style={styles.cardTop}>
                <MaterialCommunityIcons name="alert-circle" size={22} color={color} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.medicineName}>{item.medicine?.name || `Thuốc #${item.medicine}`}</Text>
                    <View style={[styles.alertTypeBadge, { backgroundColor: color + "20" }]}>
                        <Text style={[styles.alertTypeText, { color }]}>
                            {ALERT_TYPE_LABELS[item.alert_type] || item.alert_type}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => onResolve(item.id)}
                >
                    <MaterialCommunityIcons name="check" size={18} color={COLORS.green} />
                </TouchableOpacity>
            </View>
            <Text style={styles.alertMsg}>{item.message}</Text>
            <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleString("vi-VN")}
            </Text>
        </View>
    );
};

// Modal nhập kho mới
const ImportInventoryModal = ({ visible, onClose, medicines, onSuccess }) => {
    const user = useContext(MyUserContext);
    const [form, setForm] = useState({
        medicine: "", batch_number: "", quantity: "",
        expiry_date: "", import_price: "", supplier: "", warning_threshold: "10",
    });
    const [saving, setSaving] = useState(false);
    const [err,    setErr]    = useState(null);
    const [showPicker, setShowPicker] = useState(false);

    const selectedMed = medicines.find((m) => m.id === form.medicine);

    const save = async () => {
        if (!form.medicine || !form.batch_number || !form.quantity || !form.expiry_date) {
            setErr("Vui lòng điền đầy đủ: thuốc, số lô, số lượng, hạn sử dụng!"); return;
        }
        try {
            setSaving(true); setErr(null);
            await authApis(user.token).post(endpoints["inventory"], {
                medicine:          form.medicine,
                batch_number:      form.batch_number,
                quantity:          parseInt(form.quantity),
                expiry_date:       form.expiry_date,
                import_price:      parseFloat(form.import_price) || 0,
                supplier:          form.supplier,
                warning_threshold: parseInt(form.warning_threshold) || 10,
            });
            onSuccess();
            onClose();
            setForm({ medicine: "", batch_number: "", quantity: "", expiry_date: "", import_price: "", supplier: "", warning_threshold: "10" });
        } catch (e) {
            setErr(
                e?.response?.data?.non_field_errors?.[0] ||
                JSON.stringify(e?.response?.data) ||
                "Lỗi nhập kho!"
            );
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
                <Text style={styles.modalTitle}>Nhập kho thuốc</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                {/* Chọn thuốc */}
                <Text style={styles.fieldLabel}>Thuốc *</Text>
                <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(true)}>
                    <Text style={{ color: form.medicine ? COLORS.text : COLORS.textLight }}>
                        {selectedMed ? `${selectedMed.code} - ${selectedMed.name}` : "Chọn thuốc..."}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>

                {showPicker && (
                    <View style={styles.dropdown}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                            {medicines.map((m) => (
                                <TouchableOpacity
                                    key={m.id}
                                    style={styles.dropdownItem}
                                    onPress={() => { setForm({ ...form, medicine: m.id }); setShowPicker(false); }}
                                >
                                    <Text style={styles.dropdownText}>{m.code} — {m.name}</Text>
                                    <Text style={styles.dropdownSub}>{m.unit} | {m.category?.name || ""}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <TextInput
                    label="Số lô (batch number) *" value={form.batch_number}
                    onChangeText={(t) => setForm({ ...form, batch_number: t })}
                    mode="outlined" style={styles.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <View style={styles.row}>
                    <TextInput
                        label="Số lượng *" value={form.quantity}
                        onChangeText={(t) => setForm({ ...form, quantity: t })}
                        mode="outlined" keyboardType="numeric"
                        style={[styles.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                    <TextInput
                        label="Ngưỡng cảnh báo" value={form.warning_threshold}
                        onChangeText={(t) => setForm({ ...form, warning_threshold: t })}
                        mode="outlined" keyboardType="numeric"
                        style={[styles.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                </View>
                <TextInput
                    label="Hạn sử dụng (YYYY-MM-DD) *" value={form.expiry_date}
                    onChangeText={(t) => setForm({ ...form, expiry_date: t })}
                    mode="outlined" placeholder="2026-12-31"
                    style={styles.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <View style={styles.row}>
                    <TextInput
                        label="Giá nhập (đ)" value={form.import_price}
                        onChangeText={(t) => setForm({ ...form, import_price: t })}
                        mode="outlined" keyboardType="numeric"
                        style={[styles.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                    <TextInput
                        label="Nhà cung cấp" value={form.supplier}
                        onChangeText={(t) => setForm({ ...form, supplier: t })}
                        mode="outlined"
                        style={[styles.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                </View>

                <Button
                    mode="contained" onPress={save} loading={saving}
                    style={{ borderRadius: 10 }} buttonColor={COLORS.primary}
                >
                    Nhập kho
                </Button>
            </ScrollView>
        </Modal>
    );
};

const StaffInventory = () => {
    const user = useContext(MyUserContext);

    const [activeTab,  setActiveTab]  = useState("all");
    const [inventory,  setInventory]  = useState([]);
    const [alerts,     setAlerts]     = useState([]);
    const [medicines,  setMedicines]  = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showImport, setShowImport] = useState(false);

    const load = async () => {
        try {
            const [invRes, alertRes, medRes] = await Promise.all([
                authApis(user.token).get(
                    activeTab === "low_stock"   ? endpoints["inventory-low-stock"]  :
                    activeTab === "near_expiry" ? endpoints["inventory-near-expiry"] :
                    endpoints["inventory"]
                ),
                activeTab === "alerts"
                    ? authApis(user.token).get(endpoints["staff-inventory-alerts"])
                    : Promise.resolve({ data: [] }),
                authApis(user.token).get(endpoints["medicines"]),
            ]);

            setInventory(invRes.data.results || invRes.data);
            setAlerts(alertRes.data.results || alertRes.data);
            setMedicines(medRes.data.results || medRes.data);
        } catch (e) {
            console.error(e?.response?.data || e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [activeTab]);

    const resolveAlert = async (alertId) => {
        try {
            await authApis(user.token).patch(
                endpoints["inventory-alert-resolve"](alertId)
            );
            setAlerts((prev) => prev.filter((a) => a.id !== alertId));
            Alert.alert("✅", "Đã đánh dấu cảnh báo là đã xử lý!");
        } catch (e) {
            Alert.alert("Lỗi", "Không thể giải quyết cảnh báo này!");
        }
    };

    const renderItem = ({ item }) =>
        activeTab === "alerts"
            ? <AlertCard item={item} onResolve={resolveAlert} />
            : <InventoryCard item={item} />;

    const data = activeTab === "alerts" ? alerts : inventory;

    return (
        <View style={styles.container}>
            {/* Tab bar */}
            <View style={styles.tabBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 6, padding: 10 }}>
                        {TAB_CONFIG.map(({ key, label, icon }) => (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.tab,
                                    activeTab === key && styles.tabActive,
                                ]}
                                onPress={() => setActiveTab(key)}
                            >
                                <MaterialCommunityIcons
                                    name={icon} size={15}
                                    color={activeTab === key ? "#fff" : COLORS.textMuted}
                                />
                                <Text style={[
                                    styles.tabText,
                                    activeTab === key && { color: "#fff" },
                                ]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                {/* Import button */}
                <TouchableOpacity
                    style={styles.importBtn}
                    onPress={() => setShowImport(true)}
                >
                    <MaterialCommunityIcons name="plus" size={18} color={COLORS.primary} />
                    <Text style={styles.importBtnText}>Nhập kho</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(); }}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={[Styles.center, { marginTop: 60 }]}>
                            <MaterialCommunityIcons
                                name={activeTab === "alerts" ? "alert-circle-outline" : "package-variant-closed"}
                                size={52}
                                color={COLORS.border}
                            />
                            <Text style={styles.emptyText}>
                                {activeTab === "alerts"    ? "Không có cảnh báo nào" :
                                 activeTab === "low_stock"  ? "Không có thuốc nào sắp hết" :
                                 activeTab === "near_expiry"? "Không có thuốc nào sắp hết hạn" :
                                 "Kho thuốc trống"}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
                />
            )}

            <ImportInventoryModal
                visible={showImport}
                onClose={() => setShowImport(false)}
                medicines={medicines}
                onSuccess={load}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    tabBar: {
        backgroundColor: "#fff",
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        flexDirection: "row", alignItems: "center",
    },
    tab: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
        backgroundColor: "#fff",
    },
    tabActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText:    { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    importBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 12, paddingVertical: 8, marginRight: 10,
        borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.primary,
    },
    importBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 12,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardTop:       { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    medicineName:  { fontSize: 14, fontWeight: "700", color: COLORS.text },
    medicineCode:  { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    qtyBadge:      { alignItems: "center", padding: 8, borderRadius: 10, minWidth: 60 },
    qtyText:       { fontSize: 20, fontWeight: "800" },
    qtyLabel:      { fontSize: 10, color: COLORS.textMuted },
    infoRow:       { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
    infoText:      { fontSize: 12, color: COLORS.textMuted, flex: 1 },
    warningBadge:  { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, padding: 8, marginTop: 6 },
    warningText:   { fontSize: 12, fontWeight: "600", flex: 1 },
    alertTypeBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start", marginTop: 3 },
    alertTypeText: { fontSize: 11, fontWeight: "700" },
    resolveBtn:    { padding: 6, borderRadius: 8, backgroundColor: COLORS.greenPale },
    alertMsg:      { fontSize: 13, color: COLORS.text, marginTop: 4, marginBottom: 4 },
    dateText:      { fontSize: 12, color: COLORS.textLight },
    emptyText:     { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
    // Modal
    modalHeader: {
        backgroundColor: COLORS.primaryDark, paddingTop: 52,
        paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle:  { fontSize: 17, fontWeight: "700", color: "#fff" },
    fieldLabel:  { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 6 },
    picker: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8,
        padding: 13, backgroundColor: "#fff", marginBottom: 12,
    },
    dropdown: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
        backgroundColor: "#fff", marginBottom: 10, overflow: "hidden",
    },
    dropdownItem:  { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    dropdownText:  { fontSize: 14, fontWeight: "600", color: COLORS.text },
    dropdownSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    input:         { backgroundColor: "#fff", marginBottom: 10 },
    row:           { flexDirection: "row", gap: 10 },
});

export default StaffInventory;