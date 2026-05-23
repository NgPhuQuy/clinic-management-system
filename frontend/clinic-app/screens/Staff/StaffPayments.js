/**
 * screens/Staff/StaffPayments.js
 * Nhân viên thu ngân:
 *   - Danh sách thanh toán đang chờ + đã xác nhận
 *   - Thu tiền mặt (confirm payment)
 *   - Xem lịch sử thanh toán
 *
 * screens/Staff/StaffCollectPayment.js  (export phụ)
 *   - Màn hình thu tiền trực tiếp từ StaffAppointmentDetail
 */
import {
    View, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, ScrollView, TextInput as RNInput,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const PAY_STATUS = {
    all:      { label: "Tất cả",         color: COLORS.textMuted },
    pending:  { label: "Chờ thanh toán", color: COLORS.orange },
    success:  { label: "Đã thanh toán",  color: COLORS.green },
    failed:   { label: "Thất bại",       color: COLORS.red },
    refunded: { label: "Hoàn tiền",      color: COLORS.purple },
};
const PAY_METHOD_LABELS = {
    momo: "MoMo", vnpay: "VNPay", cash: "Tiền mặt",
    banking: "Chuyển khoản", credit_card: "Thẻ tín dụng",
};
const PAY_METHOD_ICONS = {
    momo: "alpha-m-circle", vnpay: "credit-card", cash: "cash",
    banking: "bank-transfer", credit_card: "credit-card-outline",
};

const PaymentCard = ({ item, onCollect }) => {
    const sCfg = PAY_STATUS[item.status] || {};
    const isPendingCash = item.status === "pending" && item.payment_method === "cash";

    return (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <MaterialCommunityIcons
                    name={PAY_METHOD_ICONS[item.payment_method] || "cash"}
                    size={22}
                    color={COLORS.primary}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.patientName} numberOfLines={1}>
                        {item.patient_name || `Bệnh nhân #${item.patient}`}
                    </Text>
                    <Text style={styles.methodText}>
                        {PAY_METHOD_LABELS[item.payment_method] || item.payment_method}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sCfg.color + "20" }]}>
                    <Text style={[styles.statusText, { color: sCfg.color }]}>{sCfg.label}</Text>
                </View>
            </View>

            <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Số tiền:</Text>
                <Text style={styles.amountValue}>
                    {Number(item.amount).toLocaleString("vi-VN")}đ
                </Text>
            </View>

            <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString("vi-VN")}
                {item.paid_at && ` • Đã TT: ${new Date(item.paid_at).toLocaleString("vi-VN")}`}
            </Text>

            {isPendingCash && (
                <TouchableOpacity
                    style={styles.collectBtn}
                    onPress={() => onCollect(item)}
                    activeOpacity={0.85}
                >
                    <MaterialCommunityIcons name="cash-register" size={16} color="#fff" />
                    <Text style={styles.collectBtnText}>Thu tiền mặt</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const StaffPayments = () => {
    const nav  = useNavigation();
    const user = useContext(MyUserContext);

    const [payments,     setPayments]     = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [refreshing,   setRefreshing]   = useState(false);
    const [activeFilter, setActiveFilter] = useState("pending");
    const [confirming,   setConfirming]   = useState(false);

    const load = async () => {
        try {
            const params = { payment_method: "cash" };
            if (activeFilter !== "all") params.status = activeFilter;
            const res = await authApis(user.token).get(endpoints["payments"], { params });
            setPayments(res.data.results || res.data);
        } catch (e) {
            console.error(e?.response?.data || e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [activeFilter]);

    const collectPayment = (item) => {
        Alert.alert(
            "💰 Xác nhận thu tiền mặt",
            `Bệnh nhân: ${item.patient_name}\nSố tiền: ${Number(item.amount).toLocaleString("vi-VN")}đ\n\nXác nhận đã nhận đủ tiền mặt?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xác nhận thu tiền",
                    onPress: async () => {
                        try {
                            setConfirming(true);
                            const res = await authApis(user.token).post(
                                endpoints["payment-confirm"](item.id),
                                {}
                            );
                            setPayments((prev) =>
                                prev.map((p) =>
                                    p.id === item.id ? { ...p, status: "success", paid_at: new Date().toISOString() } : p
                                )
                            );
                            Alert.alert("✅ Thành công", "Đã xác nhận thanh toán tiền mặt!");
                        } catch (e) {
                            const msg = e?.response?.data?.detail || "Lỗi xác nhận thanh toán!";
                            Alert.alert("Lỗi", msg);
                        } finally {
                            setConfirming(false);
                        }
                    },
                },
            ]
        );
    };

    // Summary stats (chỉ tính tiền mặt pending)
    const pendingCount  = payments.filter((p) => p.status === "pending").length;
    const pendingAmount = payments
        .filter((p) => p.status === "pending")
        .reduce((s, p) => s + Number(p.amount), 0);

    return (
        <View style={styles.container}>
            {/* Summary banner */}
            {activeFilter === "pending" && pendingCount > 0 && (
                <View style={styles.summaryBanner}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{pendingCount}</Text>
                        <Text style={styles.summaryLabel}>Đơn chờ thu</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {pendingAmount.toLocaleString("vi-VN")}đ
                        </Text>
                        <Text style={styles.summaryLabel}>Tổng cần thu</Text>
                    </View>
                </View>
            )}

            {/* Filter */}
            <View style={styles.filterBar}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={Object.entries(PAY_STATUS)}
                    keyExtractor={([k]) => k}
                    renderItem={({ item: [key, cfg] }) => (
                        <TouchableOpacity
                            style={[
                                styles.chip,
                                activeFilter === key && { backgroundColor: cfg.color, borderColor: cfg.color },
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
                    data={payments}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <PaymentCard item={item} onCollect={collectPayment} />
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
                            <MaterialCommunityIcons name="cash-off" size={52} color={COLORS.border} />
                            <Text style={styles.emptyText}>
                                {activeFilter === "pending"
                                    ? "Không có thanh toán tiền mặt đang chờ"
                                    : "Không có dữ liệu"}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
                />
            )}
        </View>
    );
};

// ─────────────────────────────────────────────
// StaffCollectPayment — màn hình thu tiền riêng
// (điều hướng từ StaffAppointmentDetail)
// ─────────────────────────────────────────────
export const StaffCollectPayment = () => {
    const nav   = useNavigation();
    const route = useRoute();
    const user  = useContext(MyUserContext);

    const { paymentId, amount, patientName, appointmentId } = route.params;

    const [note,       setNote]       = useState("");
    const [confirming, setConfirming] = useState(false);

    const confirm = async () => {
        Alert.alert(
            "Xác nhận thu tiền",
            `Thu ${Number(amount).toLocaleString("vi-VN")}đ của ${patientName}?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xác nhận",
                    onPress: async () => {
                        try {
                            setConfirming(true);
                            await authApis(user.token).post(
                                endpoints["payment-confirm"](paymentId),
                                note ? { transaction_id: note } : {}
                            );
                            Alert.alert("✅ Thành công", "Đã thu tiền mặt thành công!", [
                                { text: "OK", onPress: () => nav.goBack() },
                            ]);
                        } catch (e) {
                            const msg = e?.response?.data?.detail || "Lỗi xác nhận!";
                            Alert.alert("Lỗi", msg);
                        } finally {
                            setConfirming(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.collectContainer}>
            {/* Amount display */}
            <View style={styles.amountDisplay}>
                <Text style={styles.collectLabel}>Số tiền cần thu</Text>
                <Text style={styles.collectAmount}>
                    {Number(amount).toLocaleString("vi-VN")}đ
                </Text>
                <Text style={styles.collectPatient}>{patientName}</Text>
            </View>

            <View style={styles.collectCard}>
                <Text style={styles.collectCardTitle}>Thông tin thu tiền</Text>

                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="cash" size={18} color={COLORS.green} />
                    <Text style={styles.infoLabel}>Phương thức:</Text>
                    <Text style={styles.infoValue}>Tiền mặt</Text>
                </View>

                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="receipt" size={18} color={COLORS.primary} />
                    <Text style={styles.infoLabel}>Mã lịch hẹn:</Text>
                    <Text style={styles.infoValue}>#{appointmentId}</Text>
                </View>

                {/* Note / receipt number */}
                <Text style={styles.noteLabel}>Ghi chú / Số biên lai (tùy chọn)</Text>
                <RNInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="VD: RECEIPT-001"
                    style={styles.noteInput}
                    placeholderTextColor={COLORS.textLight}
                />

                <View style={styles.steps}>
                    {[
                        "1. Nhận đủ tiền mặt từ bệnh nhân",
                        "2. Kiểm tra số tiền khớp với hóa đơn",
                        "3. Nhấn \"Xác nhận thu tiền\" để hoàn tất",
                    ].map((s, i) => (
                        <View key={i} style={styles.stepRow}>
                            <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.green} />
                            <Text style={styles.stepText}>{s}</Text>
                        </View>
                    ))}
                </View>

                <Button
                    mode="contained"
                    icon="cash-register"
                    onPress={confirm}
                    loading={confirming}
                    disabled={confirming}
                    style={styles.confirmBtn}
                    buttonColor={COLORS.green}
                    contentStyle={{ paddingVertical: 6 }}
                >
                    Xác nhận thu tiền
                </Button>

                <Button
                    mode="outlined"
                    onPress={() => nav.goBack()}
                    style={{ borderRadius: 10, marginTop: 8 }}
                    textColor={COLORS.textMuted}
                >
                    Quay lại
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    summaryBanner: {
        flexDirection: "row", backgroundColor: COLORS.orange,
        paddingVertical: 14, paddingHorizontal: 24,
        justifyContent: "space-around", alignItems: "center",
    },
    summaryItem:   { alignItems: "center" },
    summaryValue:  { fontSize: 20, fontWeight: "800", color: "#fff" },
    summaryLabel:  { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
    summaryDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.4)" },
    filterBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
    chip: {
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: COLORS.border, backgroundColor: "#fff",
    },
    chipText:    { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardTop:     { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    methodText:  { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText:  { fontSize: 11, fontWeight: "700" },
    amountRow:   { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    amountLabel: { fontSize: 13, color: COLORS.textMuted, marginRight: 6 },
    amountValue: { fontSize: 16, fontWeight: "800", color: COLORS.primary },
    dateText:    { fontSize: 12, color: COLORS.textLight, marginBottom: 10 },
    collectBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: COLORS.orange,
        borderRadius: 10, paddingVertical: 10,
    },
    collectBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    emptyText: { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
    // Collect payment screen
    collectContainer: { flex: 1, backgroundColor: COLORS.bg },
    amountDisplay: {
        backgroundColor: COLORS.green, paddingTop: 56,
        paddingBottom: 32, alignItems: "center",
    },
    collectLabel:   { fontSize: 14, color: "rgba(255,255,255,0.8)" },
    collectAmount:  { fontSize: 38, fontWeight: "900", color: "#fff", marginVertical: 6 },
    collectPatient: { fontSize: 16, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
    collectCard: {
        margin: 16, backgroundColor: "#fff",
        borderRadius: 16, padding: 20,
        elevation: 3,
    },
    collectCardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 16 },
    infoRow:   { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
    infoLabel: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
    infoValue: { fontSize: 13, fontWeight: "600", color: COLORS.text },
    noteLabel: { fontSize: 13, color: COLORS.textMuted, marginTop: 12, marginBottom: 6 },
    noteInput: {
        borderWidth: 1.5, borderColor: COLORS.border,
        borderRadius: 8, padding: 10,
        fontSize: 14, color: COLORS.text,
        marginBottom: 16,
    },
    steps:    { backgroundColor: COLORS.greenPale, borderRadius: 10, padding: 12, marginBottom: 20 },
    stepRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
    stepText: { fontSize: 13, color: COLORS.text, flex: 1 },
    confirmBtn: { borderRadius: 10, marginBottom: 4 },
});

export default StaffPayments;