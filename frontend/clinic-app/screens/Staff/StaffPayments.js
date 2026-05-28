import {
    View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
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

const PaymentCard = ({ item }) => {
    const sCfg = PAY_STATUS[item.status] || {};

    return (
        <View style={SP.card}>
            <View style={SP.cardTop}>
                <MaterialCommunityIcons
                    name={PAY_METHOD_ICONS[item.payment_method] || "credit-card-outline"}
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
        </View>
    );
};

const StaffPayments = () => {
    const user = useContext(MyUserContext);

    const [payments,     setPayments]     = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [refreshing,   setRefreshing]   = useState(false);
    const [activeFilter, setActiveFilter] = useState("all");

    const load = async () => {
        try {
            const params = {};
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

    return (
        <View style={Styles.container}>

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
                        <PaymentCard item={item} />
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
                            <MaterialCommunityIcons name="credit-card-off-outline" size={52} color={COLORS.border} />
                            <Text style={SP.emptyText}>Không có giao dịch nào</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
                />
            )}
        </View>
    );
};

export default StaffPayments;