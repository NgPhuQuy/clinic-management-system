import {
    View, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, TextInput as RNInput,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../../configs/Apis";
import { MyUserContext } from "../../../contexts/MyContext";
import Styles, { COLORS } from "../../../styles/Styles";
import S from "./Styles";

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
        <View style={S.card}>
            <View style={S.cardTop}>
                <MaterialCommunityIcons
                    name={PAY_METHOD_ICONS[item.payment_method] || "cash"}
                    size={22}
                    color={COLORS.primary}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={S.patientName} numberOfLines={1}>
                        {item.patient_name || `Bệnh nhân #${item.patient}`}
                    </Text>
                    <Text style={S.methodText}>
                        {PAY_METHOD_LABELS[item.payment_method] || item.payment_method}
                    </Text>
                </View>
                <View style={[S.statusBadge, { backgroundColor: sCfg.color + "20" }]}>
                    <Text style={[S.statusText, { color: sCfg.color }]}>{sCfg.label}</Text>
                </View>
            </View>

            <View style={S.amountRow}>
                <Text style={S.amountLabel}>Số tiền:</Text>
                <Text style={S.amountValue}>
                    {Number(item.amount).toLocaleString("vi-VN")}đ
                </Text>
            </View>

            <Text style={S.dateText}>
                {new Date(item.created_at).toLocaleDateString("vi-VN")}
                {item.paid_at && ` • Đã TT: ${new Date(item.paid_at).toLocaleString("vi-VN")}`}
            </Text>

            {isPendingCash && (
                <TouchableOpacity
                    style={S.collectBtn}
                    onPress={() => onCollect(item)}
                    activeOpacity={0.85}
                >
                    <MaterialCommunityIcons name="cash-register" size={16} color="#fff" />
                    <Text style={S.collectBtnText}>Thu tiền mặt</Text>
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
                            await authApis(user.token).post(
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

    const pendingCount  = payments.filter((p) => p.status === "pending").length;
    const pendingAmount = payments
        .filter((p) => p.status === "pending")
        .reduce((s, p) => s + Number(p.amount), 0);

    return (
        <View style={Styles.container}>
            {activeFilter === "pending" && pendingCount > 0 && (
                <View style={S.summaryBanner}>
                    <View style={S.summaryItem}>
                        <Text style={S.summaryValue}>{pendingCount}</Text>
                        <Text style={S.summaryLabel}>Đơn chờ thu</Text>
                    </View>
                    <View style={S.summaryDivider} />
                    <View style={S.summaryItem}>
                        <Text style={S.summaryValue}>
                            {pendingAmount.toLocaleString("vi-VN")}đ
                        </Text>
                        <Text style={S.summaryLabel}>Tổng cần thu</Text>
                    </View>
                </View>
            )}

            <View style={S.filterBar}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={Object.entries(PAY_STATUS)}
                    keyExtractor={([k]) => k}
                    renderItem={({ item: [key, cfg] }) => (
                        <TouchableOpacity
                            style={[
                                S.chip,
                                activeFilter === key && { backgroundColor: cfg.color, borderColor: cfg.color },
                            ]}
                            onPress={() => setActiveFilter(key)}
                        >
                            <Text style={[S.chipText, activeFilter === key && { color: "#fff" }]}>
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
                            <Text style={S.emptyText}>
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
        <View style={S.collectContainer}>
            <View style={S.amountDisplay}>
                <Text style={S.collectLabel}>Số tiền cần thu</Text>
                <Text style={S.collectAmount}>
                    {Number(amount).toLocaleString("vi-VN")}đ
                </Text>
                <Text style={S.collectPatient}>{patientName}</Text>
            </View>

            <View style={S.collectCard}>
                <Text style={S.collectCardTitle}>Thông tin thu tiền</Text>

                <View style={S.infoRow}>
                    <MaterialCommunityIcons name="cash" size={18} color={COLORS.green} />
                    <Text style={S.infoLabel}>Phương thức:</Text>
                    <Text style={S.infoValue}>Tiền mặt</Text>
                </View>

                <View style={S.infoRow}>
                    <MaterialCommunityIcons name="receipt" size={18} color={COLORS.primary} />
                    <Text style={S.infoLabel}>Mã lịch hẹn:</Text>
                    <Text style={S.infoValue}>#{appointmentId}</Text>
                </View>

                <Text style={S.noteLabel}>Ghi chú / Số biên lai (tùy chọn)</Text>
                <RNInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="VD: RECEIPT-001"
                    style={S.noteInput}
                    placeholderTextColor={COLORS.textLight}
                />

                <View style={S.steps}>
                    {[
                        "1. Nhận đủ tiền mặt từ bệnh nhân",
                        "2. Kiểm tra số tiền khớp với hóa đơn",
                        "3. Nhấn \"Xác nhận thu tiền\" để hoàn tất",
                    ].map((s, i) => (
                        <View key={i} style={S.stepRow}>
                            <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.green} />
                            <Text style={S.stepText}>{s}</Text>
                        </View>
                    ))}
                </View>

                <Button
                    mode="contained"
                    icon="cash-register"
                    onPress={confirm}
                    loading={confirming}
                    disabled={confirming}
                    style={S.confirmBtn}
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
