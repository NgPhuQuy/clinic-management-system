import {
    View, ScrollView, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator, StatusBar, Image,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext, MyDispatchContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const ROLE_LABELS = {
    patient: "Bệnh nhân",
    doctor: "Bác sĩ",
    staff: "Nhân viên",
    admin: "Quản trị viên",
};

// Component avatar dùng lại được cho cả Profile và DoctorDetail
export const UserAvatar = ({ uri, size = 80, iconName = "account", borderRadius }) => {
    const [error, setError] = useState(false);
    const br = borderRadius ?? size / 2;
    if (uri && !error) {
        return (
            <Image
                source={{ uri }}
                style={{ width: size, height: size, borderRadius: br }}
                onError={() => setError(true)}
            />
        );
    }
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

export const Profile = () => {
    const user = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);
    const nav = useNavigation();
    const { top } = useSafeAreaInsets();
    const [patient, setPatient] = useState(null);
    const [stats, setStats] = useState({ appointments: 0, prescriptions: 0 });

    useEffect(() => {
        const load = async () => {
            if (!user?.token) return;
            try {
                const pRes = await authApis(user.token).get(endpoints["patients"] + "me/");
                setPatient(pRes.data);
            } catch (e) {
                if (e?.response?.status !== 404) console.error(e);
            }
            try {
                const [aRes, prRes] = await Promise.all([
                    authApis(user.token).get(endpoints["appointments"]),
                    authApis(user.token).get(endpoints["prescriptions"]),
                ]);
                setStats({
                    appointments: (aRes.data.results || aRes.data).length,
                    prescriptions: (prRes.data.results || prRes.data).length,
                });
            } catch (e) { /* ignore */ }
        };
        load();
    }, []);

    const logout = async () => {
        await AsyncStorage.removeItem("token");
        dispatch({ type: "logout" });
    };

    // Lấy avatar URL từ user hoặc patient object
    const avatarUri = user?.avatar || user?.avatar_url || patient?.avatar || patient?.avatar_url || null;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: top + 16 }]}>
                <UserAvatar
                    uri={avatarUri}
                    size={84}
                    iconName="account"
                    borderRadius={24}
                />
                <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{ROLE_LABELS[user?.role] || user?.role}</Text>
                </View>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statNum}>{stats.appointments}</Text>
                    <Text style={styles.statLabel}>Lần khám</Text>
                </View>
                <View style={[styles.statItem, styles.statBorder]}>
                    <Text style={styles.statNum}>{stats.prescriptions}</Text>
                    <Text style={styles.statLabel}>Đơn thuốc</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statNum}>{patient?.blood_type || "--"}</Text>
                    <Text style={styles.statLabel}>Nhóm máu</Text>
                </View>
            </View>

            {/* Thông tin bệnh nhân */}
            {patient && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>THÔNG TIN BỆNH NHÂN</Text>
                    <View style={styles.card}>
                        <InfoRow icon="phone-outline" label="Điện thoại" value={patient.phone || "Chưa cập nhật"} />
                        <InfoRow icon="cake-variant-outline" label="Ngày sinh"
                            value={patient.date_of_birth
                                ? new Date(patient.date_of_birth).toLocaleDateString("vi-VN")
                                : "Chưa cập nhật"} />
                        <InfoRow icon="gender-male-female" label="Giới tính"
                            value={patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : "Chưa cập nhật"} />
                        <InfoRow icon="map-marker-outline" label="Địa chỉ" value={patient.address || "Chưa cập nhật"} />
                        <InfoRow icon="card-account-details-outline" label="Số BHYT"
                            value={patient.insurance_number || "Chưa cập nhật"} last />
                    </View>
                </View>
            )}

            {/* Tài khoản */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>TÀI KHOẢN</Text>
                <View style={styles.card}>
                    <MenuRow icon="folder-account-outline" bg="#e3f2fd" label="Hồ sơ bệnh án"
                        sub="Xem lịch sử khám bệnh" onPress={() => nav.navigate("medical-records")} />
                    <MenuRow icon="pill" bg="#fff3e0" label="Đơn thuốc của tôi"
                        sub={`${stats.prescriptions} đơn thuốc`} badge={stats.prescriptions}
                        onPress={() => nav.navigate("prescriptions")} />
                    <MenuRow icon="flask-outline" bg="#f3e5f5" label="Kết quả cận lâm sàng"
                        sub="Xét nghiệm, chẩn đoán hình ảnh" onPress={() => nav.navigate("medical-records")} />
                    <MenuRow icon="credit-card-outline" bg="#e8f5e9" label="Lịch sử thanh toán"
                        sub="Xem hoá đơn và giao dịch" onPress={() => nav.navigate("payments")} />
                    <MenuRow icon="lock-outline" bg="#fce4ec" label="Đổi mật khẩu"
                        sub="Bảo mật tài khoản" onPress={() => nav.navigate("change-password")} last />
                </View>
            </View>

            {/* Hỗ trợ */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>HỖ TRỢ</Text>
                <View style={styles.card}>
                    <MenuRow icon="book-open-page-variant-outline" bg="#e3f2fd" label="Hướng dẫn sử dụng" onPress={() => {}} />
                    <MenuRow icon="phone-in-talk-outline" bg="#fff3e0" label="Liên hệ hỗ trợ"
                        sub="Hotline: 1900 1234" onPress={() => {}} last />
                </View>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <MaterialCommunityIcons name="logout" size={20} color={COLORS.redLight} />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
        </ScrollView>
    );
};

const InfoRow = ({ icon, label, value, last }) => (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} style={{ width: 28 }} />
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const MenuRow = ({ icon, bg, label, sub, badge, onPress, last }) => (
    <TouchableOpacity
        style={[styles.menuRow, last && { borderBottomWidth: 0 }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.menuIcon, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon} size={20} color={COLORS.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>{label}</Text>
            {sub && <Text style={styles.menuSub}>{sub}</Text>}
        </View>
        {badge > 0 && (
            <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{badge}</Text>
            </View>
        )}
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
);

// ─── Prescriptions Screen ────────────────────────────────────────────────────
export const Prescriptions = () => {
    const user = useContext(MyUserContext);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApis(user.token).get(endpoints["prescriptions"])
            .then(r => setPrescriptions(r.data.results || r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <View style={[Styles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

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
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={Styles.card}>
                            <View style={[Styles.row, { justifyContent: "space-between" }]}>
                                <View style={[styles.menuIcon, { backgroundColor: "#fff3e0", marginRight: 12 }]}>
                                    <MaterialCommunityIcons name="pill" size={22} color={COLORS.orange} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={Styles.subtitle}>Đơn thuốc #{item.id}</Text>
                                    <Text style={Styles.text}>BS. {item.doctor_name || item.doctor}</Text>
                                    <Text style={Styles.textSmall}>
                                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                                    </Text>
                                </View>
                                <View style={[Styles.badge, {
                                    backgroundColor: item.is_dispensed ? COLORS.greenLight : COLORS.orangeLight,
                                }]}>
                                    <Text style={Styles.badgeText}>{item.is_dispensed ? "Đã cấp" : "Chờ cấp"}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
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
    const user = useContext(MyUserContext);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApis(user.token).get(endpoints["payments"])
            .then(r => setPayments(r.data.results || r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <View style={[Styles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 36,
        alignItems: "center",
        gap: 6,
    },
    name: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 6 },
    roleBadge: {
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4,
    },
    roleText: { color: "#fff", fontSize: 11, fontWeight: "600" },
    email: { color: "rgba(255,255,255,0.7)", fontSize: 12 },

    statsRow: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: -22,
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        overflow: "hidden",
        zIndex: 10,
    },
    statItem: { flex: 1, paddingVertical: 16, alignItems: "center" },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
    statNum: { fontSize: 22, fontWeight: "800", color: COLORS.primary },
    statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

    section: { marginHorizontal: 16, marginTop: 20 },
    sectionTitle: {
        fontSize: 11, fontWeight: "700", color: COLORS.textLight,
        letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
    },
    infoRow: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    infoLabel: { fontSize: 11, color: COLORS.textMuted, width: 90 },
    infoValue: { fontSize: 13, color: COLORS.text, fontWeight: "500", flex: 1 },
    menuRow: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        gap: 12,
    },
    menuIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    menuLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text },
    menuSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
    badgeWrap: {
        backgroundColor: COLORS.redLight, borderRadius: 8,
        paddingHorizontal: 6, paddingVertical: 2, marginRight: 6,
    },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    logoutBtn: {
        margin: 16,
        backgroundColor: "#fff0f0",
        borderWidth: 1.5, borderColor: "#ffcdd2",
        borderRadius: 16, paddingVertical: 14,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    logoutText: { color: COLORS.redLight, fontSize: 14, fontWeight: "700" },
});