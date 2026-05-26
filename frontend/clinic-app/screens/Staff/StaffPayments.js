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
    View, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, ScrollView, TextInput as RNInput,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, staffPaymentStyles as SP } from "../../styles/Styles";

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
        <View style={SP.card}>
            <View style={SP.cardTop}>
                <MaterialCommunityIcons
                    name={PAY_METHOD_ICONS[item.payment_method] || "cash"}
                    size={22}
                    color={COLORS.primary}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={SP.patientName} numberOfLines={1}>
                        {item.patient_name || `Bệnh nhân #${item.patient}`}
                    </Text>
                    <Text style={SP.methodText}>
                        {PAY_METHOD_LABELS[item.payment_method] || item.payment_method}
                    </Text>
                </View>
                <View style={[SP.statusBadge, { backgroundColor: sCfg.color + "20" }]}>
                    <Text style={[SP.statusText, { color: sCfg.color }]}>{sCfg.label}</Text>
                </View>
            </View>

            <View style={SP.amountRow}>
                <Text style={SP.amountLabel}>Số tiền:</Text>
                <Text style={SP.amountValue}>
                    {Number(item.amount).toLocaleString("vi-VN")}đ
                </Text>
            </View>

            <Text style={SP.dateText}>
                {new Date(item.created_at).toLocaleDateString("vi-VN")}
                {item.paid_at && ` • Đã TT: ${new Date(item.paid_at).toLocaleString("vi-VN")}`}
            </Text>

            {isPendingCash && (
                <TouchableOpacity
                    style={SP.collectBtn}
                    onPress={() => onCollect(item)}
                    activeOpacity={0.85}
                >
                    <MaterialCommunityIcons name="cash-register" size={16} color="#fff" />
                    <Text style={SP.collectBtnText}>Thu tiền mặt</Text>
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
        <View style={Styles.container}>
            {/* Summary banner */}
            {activeFilter === "pending" && pendingCount > 0 && (
                <View style={SP.summaryBanner}>
                    <View style={SP.summaryItem}>
                        <Text style={SP.summaryValue}>{pendingCount}</Text>
                        <Text style={SP.summaryLabel}>Đơn chờ thu</Text>
                    </View>
                    <View style={SP.summaryDivider} />
                    <View style={SP.summaryItem}>
                        <Text style={SP.summaryValue}>
                            {pendingAmount.toLocaleString("vi-VN")}đ
                        </Text>
                        <Text style={SP.summaryLabel}>Tổng cần thu</Text>
                    </View>
                </View>
            )}

            {/* Filter */}
            <View style={SP.filterBar}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={Object.entries(PAY_STATUS)}
                    keyExtractor={([k]) => k}
                    renderItem={({ item: [key, cfg] }) => (
                        <TouchableOpacity
                            style={[
                                SP.chip,
                                activeFilter === key && { backgroundColor: cfg.color, borderColor: cfg.color },
                            ]}
                            onPress={() => setActiveFilter(key)}
                        >
                            <Text style={[SP.chipText, activeFilter === key && { color: "#fff" }]}>
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
                            <Text style={SP.emptyText}>
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
        <View style={SP.collectContainer}>
            {/* Amount display */}
            <View style={SP.amountDisplay}>
                <Text style={SP.collectLabel}>Số tiền cần thu</Text>
                <Text style={SP.collectAmount}>
                    {Number(amount).toLocaleString("vi-VN")}đ
                </Text>
                <Text style={SP.collectPatient}>{patientName}</Text>
            </View>

            <View style={SP.collectCard}>
                <Text style={SP.collectCardTitle}>Thông tin thu tiền</Text>

                <View style={SP.infoRow}>
                    <MaterialCommunityIcons name="cash" size={18} color={COLORS.green} />
                    <Text style={SP.infoLabel}>Phương thức:</Text>
                    <Text style={SP.infoValue}>Tiền mặt</Text>
                </View>

                <View style={SP.infoRow}>
                    <MaterialCommunityIcons name="receipt" size={18} color={COLORS.primary} />
                    <Text style={SP.infoLabel}>Mã lịch hẹn:</Text>
                    <Text style={SP.infoValue}>#{appointmentId}</Text>
                </View>

                {/* Note / receipt number */}
                <Text style={SP.noteLabel}>Ghi chú / Số biên lai (tùy chọn)</Text>
                <RNInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="VD: RECEIPT-001"
                    style={SP.noteInput}
                    placeholderTextColor={COLORS.textLight}
                />

                <View style={SP.steps}>
                    {[
                        "1. Nhận đủ tiền mặt từ bệnh nhân",
                        "2. Kiểm tra số tiền khớp với hóa đơn",
                        "3. Nhấn \"Xác nhận thu tiền\" để hoàn tất",
                    ].map((s, i) => (
                        <View key={i} style={SP.stepRow}>
                            <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.green} />
                            <Text style={SP.stepText}>{s}</Text>
                        </View>
                    ))}
                </View>

                <Button
                    mode="contained"
                    icon="cash-register"
                    onPress={confirm}
                    loading={confirming}
                    disabled={confirming}
                    style={SP.confirmBtn}
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

export default StaffPayments;