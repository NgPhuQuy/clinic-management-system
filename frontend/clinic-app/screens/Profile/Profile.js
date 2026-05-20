import { View, ScrollView, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, StatusBar } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext, MyDispatchContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const ROLE_LABELS = { patient: "Bệnh nhân", doctor: "Bác sĩ", staff: "Nhân viên", admin: "Quản trị viên" };

export const Profile = () => {
    const user = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);
    const nav = useNavigation();
    const [patient, setPatient] = useState(null);
    const [stats, setStats] = useState({ appointments: 0, prescriptions: 0, blood_type: "--" });

    useEffect(() => {
        const load = async () => {
            if (!user?.token) return;
            try {
                const pRes = await authApis(user.token).get(endpoints["patients"] + "me/");
                setPatient(pRes.data);
            } catch (e) {
                if (e?.response?.status !== 404) console.error(e);
            }
            // Lấy stats
            try {
                const [aRes, prRes] = await Promise.all([
                    authApis(user.token).get(endpoints["appointments"]),
                    authApis(user.token).get(endpoints["prescriptions"]),
                ]);
                setStats({
                    appointments: (aRes.data.results || aRes.data).length,
                    prescriptions: (prRes.data.results || prRes.data).length,
                    blood_type: "--",
                });
            } catch (e) { /* ignore */ }
        };
        load();
    }, []);

    const logout = async () => {
        await AsyncStorage.removeItem("token");
        dispatch({ type: "logout" });
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatarCircle}>
                    <Text style={{ fontSize: 44 }}>👤</Text>
                </View>
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
                        <InfoRow icon="cake-variant-outline" label="Ngày sinh" value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("vi-VN") : "Chưa cập nhật"} />
                        <InfoRow icon="human-male-female" label="Giới tính" value={patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : "Chưa cập nhật"} last />
                        <InfoRow icon="map-marker-outline" label="Địa chỉ" value={patient.address || "Chưa cập nhật"} />
                        <InfoRow icon="card-account-details-outline" label="Số BHYT" value={patient.insurance_number || "Chưa cập nhật"} last />
                    </View>
                </View>
            )}

            {/* Tài khoản */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>TÀI KHOẢN</Text>
                <View style={styles.card}>
                    <MenuRow icon="folder-account-outline" bg="#e3f2fd" label="Hồ sơ bệnh án" sub="Xem lịch sử khám bệnh" onPress={() => nav.navigate("medical-records")} />
                    <MenuRow icon="pill" bg="#fff3e0" label="Đơn thuốc của tôi" sub={`${stats.prescriptions} đơn thuốc`} badge={stats.prescriptions} onPress={() => nav.navigate("prescriptions")} />
                    <MenuRow icon="flask-outline" bg="#f3e5f5" label="Kết quả cận lâm sàng" sub="Xét nghiệm, chẩn đoán hình ảnh" onPress={() => nav.navigate("medical-records")} />
                    <MenuRow icon="credit-card-outline" bg="#e8f5e9" label="Lịch sử thanh toán" sub="Xem hoá đơn và giao dịch" onPress={() => nav.navigate("payments")} />
                    <MenuRow icon="lock-outline" bg="#fce4ec" label="Đổi mật khẩu" sub="Bảo mật tài khoản" onPress={() => nav.navigate("change-password")} last />
                </View>
            </View>

            {/* Hỗ trợ */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>HỖ TRỢ</Text>
                <View style={styles.card}>
                    <MenuRow icon="book-open-page-variant-outline" bg="#e3f2fd" label="Hướng dẫn sử dụng" onPress={() => {}} />
                    <MenuRow icon="phone-outline" bg="#fff3e0" label="Liên hệ hỗ trợ" sub="Hotline: 1900 1234" onPress={() => {}} last />
                </View>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={{ fontSize: 18 }}>🚪</Text>
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
    <TouchableOpacity style={[styles.menuRow, last && { borderBottomWidth: 0 }]} onPress={onPress} activeOpacity={0.7}>
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
        <Text style={{ color: COLORS.textLight, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
);

// Prescriptions Screen
export const Prescriptions = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApis(user.token).get(endpoints["prescriptions"])
            .then(r => setPrescriptions(r.data.results || r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={Styles.container}>
            {prescriptions.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <Text style={{ fontSize: 48 }}>💊</Text>
                    <Text style={[Styles.text, { marginTop: 8 }]}>Chưa có đơn thuốc nào</Text>
                </View>
            ) : (
                <FlatList
                    data={prescriptions}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={Styles.card}>
                            <View style={[Styles.row, { justifyContent: "space-between" }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={Styles.subtitle}>💊 Đơn thuốc #{item.id}</Text>
                                    <Text style={Styles.text}>BS. {item.doctor_name || item.doctor}</Text>
                                    <Text style={Styles.textSmall}>{new Date(item.created_at).toLocaleDateString("vi-VN")}</Text>
                                </View>
                                <View style={[Styles.badge, { backgroundColor: item.is_dispensed ? "#4caf50" : "#ff9800" }]}>
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

// Payments Screen
export const Payments = () => {
    const user = useContext(MyUserContext);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const PAYMENT_COLORS = { pending: "#ff9800", completed: "#4caf50", failed: "#f44336", refunded: "#9c27b0" };
    const PAYMENT_LABELS = { pending: "Chờ thanh toán", completed: "Đã thanh toán", failed: "Thất bại", refunded: "Hoàn tiền" };

    useEffect(() => {
        authApis(user.token).get(endpoints["payments"])
            .then(r => setPayments(r.data.results || r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={Styles.container}>
            {payments.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <Text style={{ fontSize: 48 }}>💳</Text>
                    <Text style={[Styles.text, { marginTop: 8 }]}>Chưa có giao dịch nào</Text>
                </View>
            ) : (
                <FlatList
                    data={payments}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <View style={Styles.card}>
                            <View style={[Styles.row, { justifyContent: "space-between" }]}>
                                <View>
                                    <Text style={Styles.subtitle}>{Number(item.amount).toLocaleString("vi-VN")}đ</Text>
                                    <Text style={Styles.textSmall}>{new Date(item.created_at).toLocaleDateString("vi-VN")}</Text>
                                </View>
                                <View style={[Styles.badge, { backgroundColor: PAYMENT_COLORS[item.status] || "#9e9e9e" }]}>
                                    <Text style={Styles.badgeText}>{PAYMENT_LABELS[item.status] || item.status}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52,
        paddingHorizontal: 20,
        paddingBottom: 36,
        alignItems: "center",
    },
    avatarCircle: {
        width: 84, height: 84,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
        marginBottom: 12,
        borderWidth: 2.5, borderColor: "rgba(255,255,255,0.4)",
    },
    name: { color: "#fff", fontSize: 20, fontWeight: "800" },
    roleBadge: {
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, marginTop: 6,
    },
    roleText: { color: "#fff", fontSize: 11, fontWeight: "600" },
    email: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 5 },

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
    statBorder: {
        borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border,
    },
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
