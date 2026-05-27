/**
 * screens/Profile/Profile.js
 * Profile, Prescriptions, Payments cho bệnh nhân
 * Payments: danh sách hoá đơn → bấm vào → chọn phương thức → xác nhận TT tiền mặt
 */
import {
    View, ScrollView, TouchableOpacity, FlatList,
    ActivityIndicator, StatusBar, Image, Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext, MyDispatchContext } from "../../contexts/MyContext";
import Styles, { COLORS, profileStyles as PS } from "../../styles/Styles";

const ROLE_LABELS = { patient: "Bệnh nhân", doctor: "Bác sĩ", staff: "Nhân viên", admin: "Quản trị viên" };

// ─── UserAvatar (reusable) ────────────────────────────────────────────────────
export const UserAvatar = ({ uri, size = 80, iconName = "account", borderRadius }) => {
    const [error, setError] = useState(false);
    const br = borderRadius ?? size / 2;
    if (uri && !error) return (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: br }} onError={() => setError(true)} />
    );
    return (
        <View style={{
            width: size, height: size, borderRadius: br,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center",
            borderWidth: 2.5, borderColor: "rgba(255,255,255,0.4)",
        }}>
            <MaterialCommunityIcons name={iconName} size={size * 0.52} color="#fff" />
        </View>
    );
};

// ─── Profile ─────────────────────────────────────────────────────────────────
export const Profile = () => {
    const user     = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);
    const nav = useNavigation();
    const { top } = useSafeAreaInsets();
    const [patient, setPatient] = useState(null);
    const [stats,   setStats]   = useState({ appointments: 0, prescriptions: 0 });

    useEffect(() => {
        const load = async () => {
            if (!user?.token) return;
            try {
                const pRes = await authApis(user.token).get(endpoints["patients"] + "me/");
                setPatient(pRes.data);
            } catch (_) {}
            try {
                const [aRes, prRes] = await Promise.all([
                    authApis(user.token).get(endpoints["appointments"]),
                    authApis(user.token).get(endpoints["prescriptions"]),
                ]);
                setStats({
                    appointments:  (aRes.data.results  || aRes.data).length,
                    prescriptions: (prRes.data.results || prRes.data).length,
                });
            } catch (_) {}
        };
        load();
    }, []);

    const logout = async () => {
        await AsyncStorage.removeItem("token");
        dispatch({ type: "logout" });
    };

    const avatarUri = user?.avatar || user?.avatar_url || patient?.avatar || null;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

            {/* Header */}
            <View style={[PS.header, { paddingTop: top + 16 }]}>
                <UserAvatar
                    uri={avatarUri}
                    size={84}
                    iconName="account"
                    borderRadius={24}
                />
                <Text style={PS.name}>{user?.first_name} {user?.last_name}</Text>
                <View style={PS.roleBadge}>
                    <Text style={PS.roleText}>{ROLE_LABELS[user?.role] || user?.role}</Text>
                </View>
                <Text style={PS.email}>{user?.email}</Text>
            </View>

            <View style={PS.statsRow}>
                <View style={PS.statItem}>
                    <Text style={PS.statNum}>{stats.appointments}</Text>
                    <Text style={PS.statLabel}>Lần khám</Text>
                </View>
                <View style={[PS.statItem, PS.statBorder]}>
                    <Text style={PS.statNum}>{stats.prescriptions}</Text>
                    <Text style={PS.statLabel}>Đơn thuốc</Text>
                </View>
                <View style={PS.statItem}>
                    <Text style={PS.statNum}>{patient?.blood_type || "--"}</Text>
                    <Text style={PS.statLabel}>Nhóm máu</Text>
                </View>
            </View>

            {patient && (
                <View style={PS.section}>
                    <Text style={PS.sectionTitle}>THÔNG TIN BỆNH NHÂN</Text>
                    <View style={PS.card}>
                        <InfoRow icon="phone-outline"              label="Điện thoại" value={patient.phone || "Chưa cập nhật"} />
                        <InfoRow icon="cake-variant-outline"       label="Ngày sinh"  value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("vi-VN") : "Chưa cập nhật"} />
                        <InfoRow icon="gender-male-female"         label="Giới tính"  value={patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : "Chưa cập nhật"} />
                        <InfoRow icon="map-marker-outline"         label="Địa chỉ"    value={patient.address || "Chưa cập nhật"} />
                        <InfoRow icon="card-account-details-outline" label="Số BHYT" value={patient.insurance_number || "Chưa cập nhật"} last />
                    </View>
                </View>
            )}

            <View style={PS.section}>
                <Text style={PS.sectionTitle}>TÀI KHOẢN</Text>
                <View style={PS.card}>
                    <MenuRow icon="folder-account-outline" bg="#e3f2fd" label="Hồ sơ bệnh án"        sub="Xem lịch sử khám bệnh"           onPress={() => nav.navigate("medical-records")} />
                    <MenuRow icon="pill"                   bg="#fff3e0" label="Đơn thuốc của tôi"     sub={`${stats.prescriptions} đơn thuốc`} badge={stats.prescriptions} onPress={() => nav.navigate("prescriptions")} />
                    <MenuRow icon="flask-outline"          bg="#f3e5f5" label="Kết quả cận lâm sàng"  sub="Xét nghiệm, chẩn đoán hình ảnh" onPress={() => nav.navigate("medical-records")} />
                    <MenuRow icon="credit-card-outline"    bg="#e8f5e9" label="Lịch sử thanh toán"    sub="Xem hoá đơn và giao dịch"        onPress={() => nav.navigate("payments")} />
                    <MenuRow icon="lock-outline"           bg="#fce4ec" label="Đổi mật khẩu"          sub="Bảo mật tài khoản"               onPress={() => nav.navigate("change-password")} last />
                </View>
            </View>

            <View style={PS.section}>
                <Text style={PS.sectionTitle}>HỖ TRỢ</Text>
                <View style={PS.card}>
                    <MenuRow icon="book-open-page-variant-outline" bg="#e3f2fd" label="Hướng dẫn sử dụng" onPress={() => {}} />
                    <MenuRow icon="phone-in-talk-outline"          bg="#fff3e0" label="Liên hệ hỗ trợ"    sub="Hotline: 1900 1234" onPress={() => {}} last />
                </View>
            </View>

            <TouchableOpacity style={PS.logoutBtn} onPress={logout}>
                <MaterialCommunityIcons name="logout" size={20} color="#f44336" />
                <Text style={PS.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
        </ScrollView>
    );
};

const InfoRow = ({ icon, label, value, last }) => (
    <View style={[PS.infoRow, last && { borderBottomWidth: 0 }]}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} style={{ width: 28 }} />
        <Text style={PS.infoLabel}>{label}</Text>
        <Text style={PS.infoValue}>{value}</Text>
    </View>
);

const MenuRow = ({ icon, bg, label, sub, badge, onPress, last }) => (
    <TouchableOpacity style={[PS.menuRow, last && { borderBottomWidth: 0 }]} onPress={onPress} activeOpacity={0.7}>
        <View style={[PS.menuIcon, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon} size={20} color={COLORS.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={PS.menuLabel}>{label}</Text>
            {sub && <Text style={PS.menuSub}>{sub}</Text>}
        </View>
        {badge > 0 && (
            <View style={PS.badgeWrap}><Text style={PS.badgeText}>{badge}</Text></View>
        )}
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
);

// ─── Prescriptions ────────────────────────────────────────────────────────────
export const Prescriptions = () => {
    const user = useContext(MyUserContext);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    const MOCK_PRESC = [
        { id:1, doctor_name:"Nguyễn Văn An", status:"dispensed", created_at: new Date(Date.now()-2*86400*1000).toISOString(), notes:"3 loại thuốc" },
        { id:2, doctor_name:"Lê Minh Cường",  status:"pending",   created_at: new Date(Date.now()-5*86400*1000).toISOString(), notes:"2 loại thuốc" },
        { id:3, doctor_name:"Phạm Thị Dung",  status:"dispensed", created_at: new Date(Date.now()-10*86400*1000).toISOString(), notes:"4 loại thuốc" },
    ];

    useEffect(() => {
        authApis(user.token).get(endpoints["prescriptions"])
            .then(r => { const d = r.data.results || r.data; setPrescriptions(d.length > 0 ? d : MOCK_PRESC); })
            .catch(() => setPrescriptions(MOCK_PRESC))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={Styles.container}>
            {prescriptions.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <MaterialCommunityIcons name="pill" size={64} color={COLORS.textLight} />
                    <Text style={[Styles.text, { marginTop: 12, fontWeight: "600" }]}>Chưa có đơn thuốc nào</Text>
                </View>
            ) : (
                <FlatList
                    data={prescriptions}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <View style={[PS.card, { marginBottom: 10, overflow: "visible" }]}>
                            <View style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}>
                                <View style={[PS.menuIcon, { backgroundColor: "#fff3e0" }]}>
                                    <MaterialCommunityIcons name="pill" size={22} color={COLORS.orange} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={Styles.subtitle}>Đơn thuốc #{item.id}</Text>
                                    <Text style={Styles.text}>BS. {item.doctor_name || item.doctor}</Text>
                                    <Text style={Styles.textSmall}>
                                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                                        {item.notes ? ` • ${item.notes}` : ""}
                                    </Text>
                                </View>
                                <View style={[Styles.badge, {
                                    backgroundColor: item.status === "dispensed" ? COLORS.greenLight : COLORS.orangeLight,
                                }]}>
                                    <Text style={Styles.badgeText}>{item.status === "dispensed" ? "Đã cấp" : "Chờ cấp"}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
};

// ─── Payments Screen ─────────────────────────────────────────────────────────
const PAY_STATUS_COLORS = {
    pending:  COLORS.orangeLight,
    success:  COLORS.greenLight,
    failed:   COLORS.redLight,
    refunded: COLORS.purpleLight,
};
const PAY_STATUS_LABELS = {
    pending:  "Chờ thanh toán",
    success:  "Đã thanh toán",
    failed:   "Thất bại",
    refunded: "Đã hoàn tiền",
};
const PAY_METHOD_ICONS = {
    momo: "wallet", vnpay: "qrcode-scan", cash: "cash",
    banking: "bank-transfer", credit_card: "credit-card",
};
const PAY_METHOD_LABELS = {
    momo: "MoMo", vnpay: "VNPay", cash: "Tiền mặt",
    banking: "Chuyển khoản", credit_card: "Thẻ tín dụng",
};
const PAY_METHOD_COLORS = {
    momo: "#ae2070", vnpay: "#005baf", cash: COLORS.green,
    banking: COLORS.teal, credit_card: COLORS.purple,
};

export const Payments = () => {
    const nav  = useNavigation();
    const user = useContext(MyUserContext);

    useEffect(() => {
        authApis(user.token).get(endpoints["payments"])
            .then(r => { const d = r.data.results || r.data; setInvoices(d.length > 0 ? d : MOCK_INVOICES); })
            .catch(() => setInvoices(MOCK_INVOICES))
            .finally(() => setLoading(false));
    }, []);

    const STATUS_FILTERS = [
        { key: "all",     label: "Tất cả" },
        { key: "pending", label: "Chờ TT" },
        { key: "success", label: "Đã TT"  },
    ];

    const displayed = filterStatus === "all"
        ? invoices
        : invoices.filter(i => i.status === filterStatus);

    // Mở invoice → chọn phương thức → xác nhận
    const openInvoice = (inv) => {
        if (inv.status !== "pending") return; // chỉ cho TT nếu pending
        setSelected(inv);
        setMethod(null);
    };

    const proceedPayment = () => {
        if (!selectedMethod) {
            Alert.alert("Chưa chọn phương thức", "Vui lòng chọn phương thức thanh toán.");
            return;
        }
        if (selectedMethod === "cash") {
            setShowCash(true);
        } else {
            // Online → chuyển sang PaymentScreen (MoMo/VNPay)
            nav.navigate("payment-screen", {
                appointmentId:   selectedInvoice.appointment_id,
                doctorName:      selectedInvoice.doctor_name,
                appointmentDate: selectedInvoice.created_at,
                amount:          selectedInvoice.amount,
                fromBooking:     false,
            });
            setSelected(null);
        }
    };

    const confirmCash = async (inv) => {
        try {
            await authApis(user.token).post(endpoints["payment-confirm"](inv.id), {});
        } catch (_) {}
        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "success", paid_at: new Date().toISOString() } : i));
        setShowCash(false);
        setSelected(null);
        Alert.alert("✅ Đã ghi nhận", "Vui lòng đến quầy thu ngân để hoàn tất thanh toán!");
    };

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    const renderPayment = ({ item }) => {
        const statusColor = PAY_STATUS_COLORS[item.status] || "#9e9e9e";
        const methodIcon  = PAY_METHOD_ICONS[item.payment_method] || "credit-card-outline";
        const methodColor = PAY_METHOD_COLORS[item.payment_method] || COLORS.primary;
        const methodLabel = PAY_METHOD_LABELS[item.payment_method] || item.payment_method;
        const date = item.paid_at || item.created_at;

        return (
            <View style={payStyles.card}>
                {/* Left: method icon */}
                <View style={[payStyles.methodIcon, { backgroundColor: methodColor + "18" }]}>
                    <MaterialCommunityIcons name={methodIcon} size={22} color={methodColor} />
                </View>

                {/* Center: info */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={payStyles.topRow}>
                        <Text style={payStyles.amount}>
                            {Number(item.amount).toLocaleString("vi-VN")}đ
                        </Text>
                        <View style={[payStyles.badge, { backgroundColor: statusColor + "22" }]}>
                            <Text style={[payStyles.badgeText, { color: statusColor }]}>
                                {PAY_STATUS_LABELS[item.status] || item.status}
                            </Text>
                        </View>
                    </View>
                    <View style={payStyles.bottomRow}>
                        <MaterialCommunityIcons name={methodIcon} size={12} color={COLORS.textLight} />
                        <Text style={payStyles.meta}>  {methodLabel}</Text>
                        <Text style={payStyles.metaDot}>  ·  </Text>
                        <Text style={payStyles.meta}>
                            {new Date(date).toLocaleDateString("vi-VN")}
                        </Text>
                    </View>
                    {item.note ? (
                        <Text style={payStyles.note} numberOfLines={1}>{item.note}</Text>
                    ) : null}
                </View>
            </View>
        );
    };

    return (
        <View style={Styles.container}>
            {payments.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <MaterialCommunityIcons name="receipt-text-outline" size={64} color={COLORS.textLight} />
                    <Text style={[Styles.text, { marginTop: 12, fontWeight: "600" }]}>Chưa có giao dịch nào</Text>
                </View>
            ) : (
                <FlatList
                    data={payments}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={renderPayment}
                />
            )}
        </View>
    );
};

const payStyles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    methodIcon: {
        width: 46, height: 46,
        borderRadius: 13,
        alignItems: "center", justifyContent: "center",
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    amount: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    bottomRow: { flexDirection: "row", alignItems: "center" },
    meta: { fontSize: 11, color: COLORS.textMuted },
    metaDot: { fontSize: 11, color: COLORS.textLight },
    note: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
});

