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
import Styles, { COLORS, staffInventoryStyles as S } from "../../styles/Styles";
import { DatePickerField } from "../../components/DatePickerField";


const MOCK_INVENTORY = [
    { id:1, medicine:{ name:"Amlodipine 5mg",   code:"MED001", unit:"viên" }, batch_number:"LOT001", quantity:250,  expiry_date:"2026-12-31", supplier:"Dược Hậu Giang", warning_threshold:20, is_low:false },
    { id:2, medicine:{ name:"Amoxicillin 500mg", code:"MED006", unit:"viên" }, batch_number:"LOT006", quantity:8,    expiry_date:"2026-08-15", supplier:"Pymepharco",     warning_threshold:20, is_low:true  },
    { id:3, medicine:{ name:"Paracetamol 500mg", code:"MED011", unit:"viên" }, batch_number:"LOT011", quantity:500,  expiry_date:"2027-03-01", supplier:"OPC Pharma",     warning_threshold:50, is_low:false },
    { id:4, medicine:{ name:"Vitamin C 500mg",   code:"MED021", unit:"viên" }, batch_number:"LOT021", quantity:5,    expiry_date:"2025-10-01", supplier:"Traphaco",       warning_threshold:20, is_low:true  },
    { id:5, medicine:{ name:"Omeprazole 20mg",   code:"MED016", unit:"viên" }, batch_number:"LOT016", quantity:180,  expiry_date:"2026-06-30", supplier:"Imexpharm",      warning_threshold:30, is_low:false },
    { id:6, medicine:{ name:"Metformin 500mg",   code:"MED026", unit:"viên" }, batch_number:"LOT026", quantity:12,   expiry_date:"2026-04-20", supplier:"Pymepharco",     warning_threshold:20, is_low:true  },
];


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
        <View style={[S.card, { borderLeftColor: borderColor, borderLeftWidth: 4 }]}>
            <View style={S.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={S.medicineName} numberOfLines={1}>
                        {item.medicine_name || item.medicine?.name || `Thuốc #${item.medicine}`}
                    </Text>
                    <Text style={S.medicineCode}>
                        Lô: {item.batch_number} • {item.medicine?.unit || ""}
                    </Text>
                </View>
                <View style={[
                    S.qtyBadge,
                    {
                        backgroundColor: isLow ? COLORS.orangePale : COLORS.greenPale,
                    }
                ]}>
                    <Text style={[
                        S.qtyText,
                        { color: isLow ? COLORS.orange : COLORS.green }
                    ]}>
                        {item.quantity}
                    </Text>
                    <Text style={S.qtyLabel}>còn lại</Text>
                </View>
            </View>

            <View style={S.infoRow}>
                <MaterialCommunityIcons name="calendar-range" size={13} color={COLORS.textMuted} />
                <Text style={S.infoText}>
                    Hạn: {new Date(item.expiry_date).toLocaleDateString("vi-VN")}
                    {isExpired    && " — ⛔ ĐÃ HẾT HẠN"}
                    {isNearExpiry && ` — ⚠️ còn ${daysLeft} ngày`}
                </Text>
            </View>

            <View style={S.infoRow}>
                <MaterialCommunityIcons name="alert-outline" size={13} color={COLORS.textMuted} />
                <Text style={S.infoText}>
                    Ngưỡng cảnh báo: {item.warning_threshold} | Nhà cung cấp: {item.supplier || "—"}
                </Text>
            </View>

            {(isLow || isNearExpiry || isExpired) && (
                <View style={[S.warningBadge, { backgroundColor: borderColor + "15" }]}>
                    <MaterialCommunityIcons name="alert" size={13} color={borderColor} />
                    <Text style={[S.warningText, { color: borderColor }]}>
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
        <View style={[S.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
            <View style={S.cardTop}>
                <MaterialCommunityIcons name="alert-circle" size={22} color={color} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={S.medicineName}>{item.medicine_name || item.medicine?.name || `Thuốc #${item.medicine}`}</Text>
                    <View style={[S.alertTypeBadge, { backgroundColor: color + "20" }]}>
                        <Text style={[S.alertTypeText, { color }]}>
                            {ALERT_TYPE_LABELS[item.alert_type] || item.alert_type}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={S.resolveBtn}
                    onPress={() => onResolve(item.id)}
                >
                    <MaterialCommunityIcons name="check" size={18} color={COLORS.green} />
                </TouchableOpacity>
            </View>
            <Text style={S.alertMsg}>{item.message}</Text>
            <Text style={S.dateText}>
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
    const [saving,     setSaving]     = useState(false);
    const [err,        setErr]        = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [search,     setSearch]     = useState("");

    const selectedMed   = medicines.find((m) => m.id === form.medicine);
    const filteredMeds  = medicines.filter((m) => {
        const q = search.toLowerCase();
        return !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q);
    });

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
            setSearch("");
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
            <View style={S.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={S.modalTitle}>Nhập kho thuốc</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                {/* Chọn thuốc */}
                <Text style={S.fieldLabel}>Thuốc *</Text>
                <TouchableOpacity
                    style={S.picker}
                    onPress={() => { setShowPicker((v) => !v); setSearch(""); }}
                >
                    <Text style={{ color: form.medicine ? COLORS.text : COLORS.textLight, flex: 1 }}>
                        {selectedMed ? `${selectedMed.code} – ${selectedMed.name}` : "Chọn thuốc..."}
                    </Text>
                    <MaterialCommunityIcons
                        name={showPicker ? "chevron-up" : "chevron-down"}
                        size={20} color={COLORS.textMuted}
                    />
                </TouchableOpacity>

                {showPicker && (
                    <View style={S.dropdown}>
                        {/* Search box */}
                        <View style={S.searchRow}>
                            <MaterialCommunityIcons name="magnify" size={16} color={COLORS.textMuted} />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Tìm theo tên hoặc mã thuốc..."
                                placeholderTextColor={COLORS.textLight}
                                style={S.searchInput}
                                autoFocus
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch("")}>
                                    <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                            {filteredMeds.length === 0 ? (
                                <Text style={[S.dropdownSub, { padding: 12, textAlign: "center" }]}>
                                    Không tìm thấy thuốc
                                </Text>
                            ) : filteredMeds.map((m) => (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[
                                        S.dropdownItem,
                                        form.medicine === m.id && { backgroundColor: COLORS.primaryPale },
                                    ]}
                                    onPress={() => { setForm({ ...form, medicine: m.id }); setShowPicker(false); setSearch(""); }}
                                >
                                    <Text style={S.dropdownText}>{m.code} — {m.name}</Text>
                                    <Text style={S.dropdownSub}>{m.unit} | {m.category?.name || ""}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <TextInput
                    label="Số lô (batch number) *" value={form.batch_number}
                    onChangeText={(t) => setForm({ ...form, batch_number: t })}
                    mode="outlined" style={S.input}
                    outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <View style={S.row}>
                    <TextInput
                        label="Số lượng *" value={form.quantity}
                        onChangeText={(t) => setForm({ ...form, quantity: t })}
                        mode="outlined" keyboardType="numeric"
                        style={[S.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                    <TextInput
                        label="Ngưỡng cảnh báo" value={form.warning_threshold}
                        onChangeText={(t) => setForm({ ...form, warning_threshold: t })}
                        mode="outlined" keyboardType="numeric"
                        style={[S.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                </View>
                <DatePickerField
                    label="Hạn sử dụng *"
                    value={form.expiry_date}
                    onChange={(v) => setForm({ ...form, expiry_date: v })}
                />
                <View style={S.row}>
                    <TextInput
                        label="Giá nhập (đ)" value={form.import_price}
                        onChangeText={(t) => setForm({ ...form, import_price: t })}
                        mode="outlined" keyboardType="numeric"
                        style={[S.input, { flex: 1 }]}
                        outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                    />
                    <TextInput
                        label="Nhà cung cấp" value={form.supplier}
                        onChangeText={(t) => setForm({ ...form, supplier: t })}
                        mode="outlined"
                        style={[S.input, { flex: 1 }]}
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
            console.warn("StaffInventory mock:", e?.response?.status);
            setInventory(MOCK_INVENTORY);
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
        <View style={S.container}>
            {/* Tab bar */}
            <View style={S.tabBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 6, padding: 10 }}>
                        {TAB_CONFIG.map(({ key, label, icon }) => (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    S.tab,
                                    activeTab === key && S.tabActive,
                                ]}
                                onPress={() => setActiveTab(key)}
                            >
                                <MaterialCommunityIcons
                                    name={icon} size={15}
                                    color={activeTab === key ? "#fff" : COLORS.textMuted}
                                />
                                <Text style={[
                                    S.tabText,
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
                    style={S.importBtn}
                    onPress={() => setShowImport(true)}
                >
                    <MaterialCommunityIcons name="plus" size={18} color={COLORS.primary} />
                    <Text style={S.importBtnText}>Nhập kho</Text>
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
                            <Text style={S.emptyText}>
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
export default StaffInventory;