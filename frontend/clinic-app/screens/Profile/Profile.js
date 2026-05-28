import {
    View, ScrollView, TouchableOpacity, FlatList,
    ActivityIndicator, StatusBar, Image, Alert, Modal,
    TextInput as RNTextInput,
} from "react-native";
import { Text, Button, HelperText } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext, MyDispatchContext } from "../../contexts/MyContext";
import Styles, { COLORS, profileStyles as PS } from "../../styles/Styles";
import { DatePickerField } from "../../components/DatePickerField";
import { editProfileStyles as editStyles, paymentsStyles as payStyles } from "./Styles";

const ROLE_LABELS = { patient: "Bệnh nhân", doctor: "Bác sĩ", staff: "Nhân viên", admin: "Quản trị viên" };

const GENDER_OPTIONS = [
    { value: "male", label: "Nam" },
    { value: "female", label: "Nữ" },
    { value: "other", label: "Khác" },
];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EditProfileModal = ({ visible, patient, onClose, onSuccess }) => {
    const user = useContext(MyUserContext);
    const [form, setForm] = useState({
        phone: "", date_of_birth: "", gender: "", blood_type: "",
        emergency_contact: "", insurance_number: "",
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (visible && patient) {
            setForm({
                phone: patient.phone || "",
                date_of_birth: patient.date_of_birth || "",
                gender: patient.gender || "",
                blood_type: patient.blood_type || "",
                emergency_contact: patient.emergency_contact || "",
                insurance_number: patient.insurance_number || "",
            });
            setErr(null);
        }
    }, [visible, patient]);

    const save = async () => {
        try {
            setSaving(true); setErr(null);
            const payload = { ...form };
            if (!payload.date_of_birth) delete payload.date_of_birth;
            await authApis(user.token).patch(endpoints["patients"] + "me/", payload);
            onSuccess();
            onClose();
        } catch (e) {
            const data = e?.response?.data;
            const msg = data?.detail || Object.values(data || {}).flat().join("\n") || "Lỗi cập nhật!";
            setErr(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={editStyles.header}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={editStyles.headerTitle}>Chỉnh sửa hồ sơ</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                <Text style={editStyles.label}>Số điện thoại</Text>
                <RNTextInput
                    style={editStyles.input}
                    value={form.phone}
                    onChangeText={v => setForm({ ...form, phone: v })}
                    keyboardType="phone-pad"
                    placeholder="Nhập số điện thoại"
                    placeholderTextColor={COLORS.textLight}
                />

                <Text style={editStyles.label}>Ngày sinh</Text>
                <DatePickerField
                    label="Ngày sinh"
                    value={form.date_of_birth}
                    onChange={v => setForm({ ...form, date_of_birth: v })}
                    clearLabel="Xóa ngày sinh"
                />

                <Text style={editStyles.label}>Giới tính</Text>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                    {GENDER_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[editStyles.chip, form.gender === opt.value && editStyles.chipActive]}
                            onPress={() => setForm({ ...form, gender: opt.value })}
                        >
                            <Text style={[editStyles.chipText, form.gender === opt.value && { color: "#fff" }]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={editStyles.label}>Nhóm máu</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    {BLOOD_TYPES.map(bt => (
                        <TouchableOpacity
                            key={bt}
                            style={[editStyles.chip, form.blood_type === bt && editStyles.chipActive]}
                            onPress={() => setForm({ ...form, blood_type: bt })}
                        >
                            <Text style={[editStyles.chipText, form.blood_type === bt && { color: "#fff" }]}>{bt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={editStyles.label}>Liên hệ khẩn</Text>
                <RNTextInput
                    style={editStyles.input}
                    value={form.emergency_contact}
                    onChangeText={v => setForm({ ...form, emergency_contact: v })}
                    placeholder="Tên và số điện thoại người thân"
                    placeholderTextColor={COLORS.textLight}
                />

                <Text style={editStyles.label}>Số thẻ BHYT</Text>
                <RNTextInput
                    style={editStyles.input}
                    value={form.insurance_number}
                    onChangeText={v => setForm({ ...form, insurance_number: v })}
                    placeholder="Số bảo hiểm y tế"
                    placeholderTextColor={COLORS.textLight}
                />

                <Button
                    mode="contained"
                    onPress={save}
                    loading={saving}
                    disabled={saving}
                    style={{ borderRadius: 10, marginTop: 8 }}
                    buttonColor={COLORS.primary}
                >
                    Lưu thay đổi
                </Button>
                <View style={{ height: 32 }} />
            </ScrollView>
        </Modal>
    );
};


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

export const Profile = () => {
    const user = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);
    const nav = useNavigation();
    const { top } = useSafeAreaInsets();
    const [patient, setPatient] = useState(null);
    const [stats, setStats] = useState({ appointments: 0, prescriptions: 0 });
    const [editVisible, setEditVisible] = useState(false);

    const loadPatient = async () => {
        if (!user?.token) return;
        try {
            const pRes = await authApis(user.token).get(endpoints["patients"] + "me/");
            setPatient(pRes.data);
        } catch (_) { }
    };

    useEffect(() => {
        const load = async () => {
            await loadPatient();
            try {
                const [aRes, prRes] = await Promise.all([
                    authApis(user.token).get(endpoints["appointments"]),
                    authApis(user.token).get(endpoints["prescriptions"]),
                ]);
                setStats({
                    appointments: (aRes.data.results || aRes.data).length,
                    prescriptions: (prRes.data.results || prRes.data).length,
                });
            } catch (_) { }
        };
        load();
    }, []);

    const logout = async () => {
        await AsyncStorage.removeItem("token");
        dispatch({ type: "logout" });
    };

    const avatarUri = user?.avatar_url || user?.avatar || null;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

            <View style={[PS.header, { paddingTop: top + 16 }]}>
                <UserAvatar
                    uri={avatarUri}
                    size={84}
                    iconName="account"
                    borderRadius={24}
                />
                <Text style={PS.name}>{[user?.last_name, user?.first_name].filter(Boolean).join(" ") || user?.username}</Text>
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
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <Text style={PS.sectionTitle}>THÔNG TIN BỆNH NHÂN</Text>
                        <TouchableOpacity
                            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary }}
                            onPress={() => setEditVisible(true)}
                        >
                            <MaterialCommunityIcons name="pencil-outline" size={14} color={COLORS.primary} />
                            <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: "700" }}>Chỉnh sửa</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={PS.card}>
                        <InfoRow icon="phone-outline" label="Điện thoại" value={patient.phone || "Chưa cập nhật"} />
                        <InfoRow icon="cake-variant-outline" label="Ngày sinh" value={patient.date_of_birth ? new Date(patient.date_of_birth + "T00:00:00").toLocaleDateString("vi-VN") : "Chưa cập nhật"} />
                        <InfoRow icon="gender-male-female" label="Giới tính" value={patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : patient.gender === "other" ? "Khác" : "Chưa cập nhật"} />
                        <InfoRow icon="water-outline" label="Nhóm máu" value={patient.blood_type || "Chưa cập nhật"} />
                        <InfoRow icon="account-heart-outline" label="Liên hệ khẩn" value={patient.emergency_contact || "Chưa cập nhật"} />
                        <InfoRow icon="card-account-details-outline" label="Số BHYT" value={patient.insurance_number || "Chưa cập nhật"} last />
                    </View>
                </View>
            )}

            <View style={PS.section}>
                <Text style={PS.sectionTitle}>TÀI KHOẢN</Text>
                <View style={PS.card}>
                    <MenuRow icon="folder-account-outline" bg="#e3f2fd" label="Hồ sơ bệnh án" sub="Xem lịch sử khám bệnh" onPress={() => nav.navigate("medical-records")} />
                    <MenuRow icon="pill" bg="#fff3e0" label="Đơn thuốc của tôi" sub={`${stats.prescriptions} đơn thuốc`} badge={stats.prescriptions} onPress={() => nav.navigate("prescriptions")} />
                    <MenuRow icon="flask-outline" bg="#f3e5f5" label="Kết quả cận lâm sàng" sub="Xét nghiệm, chẩn đoán hình ảnh" onPress={() => nav.navigate("test-results")} />
                    <MenuRow icon="credit-card-outline" bg="#e8f5e9" label="Lịch sử thanh toán" sub="Xem hoá đơn và giao dịch" onPress={() => nav.navigate("payments")} />
                    <MenuRow icon="lock-outline" bg="#fce4ec" label="Đổi mật khẩu" sub="Bảo mật tài khoản" onPress={() => nav.navigate("change-password")} last />
                </View>
            </View>

            <View style={PS.section}>
                <Text style={PS.sectionTitle}>HỖ TRỢ</Text>
                <View style={PS.card}>
                    <MenuRow icon="book-open-page-variant-outline" bg="#e3f2fd" label="Hướng dẫn sử dụng" onPress={() => { }} />
                    <MenuRow icon="phone-in-talk-outline" bg="#fff3e0" label="Liên hệ hỗ trợ" sub="Hotline: 1900 1234" onPress={() => { }} last />
                </View>
            </View>

            <TouchableOpacity style={PS.logoutBtn} onPress={logout}>
                <MaterialCommunityIcons name="logout" size={20} color="#f44336" />
                <Text style={PS.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />

            <EditProfileModal
                visible={editVisible}
                patient={patient}
                onClose={() => setEditVisible(false)}
                onSuccess={loadPatient}
            />
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

export const Prescriptions = () => {
    const user = useContext(MyUserContext);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApis(user.token).get(endpoints["prescriptions"])
            .then(r => { const d = r.data.results || r.data; setPrescriptions(Array.isArray(d) ? d : []); })
            .catch(() => setPrescriptions([]))
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
                                <View style={{
                                    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                                    backgroundColor: item.status === "dispensed" ? COLORS.green + "22" : COLORS.orange + "22",
                                }}>
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: item.status === "dispensed" ? COLORS.green : COLORS.orange }}>
                                        {item.status === "dispensed" ? "Đã cấp" : "Chờ cấp"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const PAY_STATUS_COLORS = {
    pending: COLORS.orange,
    success: COLORS.green,
    failed: COLORS.red,
    refunded: COLORS.purple,
};
const PAY_STATUS_LABELS = {
    pending: "Chờ thanh toán",
    success: "Đã thanh toán",
    failed: "Thất bại",
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

const STATUS_FILTERS = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Chờ TT" },
    { key: "success", label: "Đã TT" },
    { key: "refunded", label: "Hoàn tiền" },
];

export const Payments = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        authApis(user.token).get(endpoints["payments"])
            .then(r => { const d = r.data.results || r.data; setPayments(Array.isArray(d) ? d : []); })
            .catch(() => setPayments([]))
            .finally(() => setLoading(false));
    }, []);

    const displayed = filterStatus === "all" ? payments : payments.filter(p => p.status === filterStatus);
    const totalPaid = payments.filter(p => p.status === "success").reduce((s, p) => s + Number(p.amount || 0), 0);
    const pendingCnt = payments.filter(p => p.status === "pending").length;

    if (loading) return (
        <View style={[Styles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

    const renderPayment = ({ item }) => {
        const statusColor = PAY_STATUS_COLORS[item.status] || COLORS.textMuted;
        const methodIcon = PAY_METHOD_ICONS[item.payment_method] || "credit-card-outline";
        const methodColor = PAY_METHOD_COLORS[item.payment_method] || COLORS.primary;
        const methodLabel = PAY_METHOD_LABELS[item.payment_method] || item.payment_method || "—";
        const date = item.paid_at || item.created_at;
        const isPending = item.status === "pending";

        return (
            <View style={[payStyles.card, { borderLeftColor: statusColor }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={[payStyles.methodIcon, { backgroundColor: methodColor + "18" }]}>
                        <MaterialCommunityIcons name={methodIcon} size={22} color={methodColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={payStyles.topRow}>
                            <Text style={payStyles.amount}>
                                {Number(item.amount || 0).toLocaleString("vi-VN")}đ
                            </Text>
                            <View style={[payStyles.badge, { backgroundColor: statusColor + "22" }]}>
                                <Text style={[payStyles.badgeText, { color: statusColor }]}>
                                    {PAY_STATUS_LABELS[item.status] || item.status}
                                </Text>
                            </View>
                        </View>
                        <View style={payStyles.metaRow}>
                            <MaterialCommunityIcons name={methodIcon} size={12} color={COLORS.textLight} />
                            <Text style={payStyles.meta}> {methodLabel}</Text>
                            {date ? (
                                <>
                                    <Text style={payStyles.metaDot}> · </Text>
                                    <Text style={payStyles.meta}>
                                        {new Date(date).toLocaleDateString("vi-VN")}
                                    </Text>
                                </>
                            ) : null}
                        </View>
                        {item.note ? (
                            <Text style={payStyles.note} numberOfLines={1}>{item.note}</Text>
                        ) : null}
                    </View>
                </View>

                {isPending && (
                    <TouchableOpacity
                        style={payStyles.payBtn}
                        activeOpacity={0.8}
                        onPress={() => nav.navigate("payment-screen", {
                            invoiceId: item.invoice,
                            amount: Number(item.amount || 0),
                            fromBooking: false,
                        })}
                    >
                        <MaterialCommunityIcons name="credit-card-outline" size={15} color="#fff" />
                        <Text style={payStyles.payBtnText}>Thanh toán ngay</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <View style={payStyles.summaryBanner}>
                <View style={payStyles.summaryItem}>
                    <Text style={payStyles.summaryNum}>{payments.length}</Text>
                    <Text style={payStyles.summaryLabel}>Giao dịch</Text>
                </View>
                <View style={payStyles.summaryDivider} />
                <View style={payStyles.summaryItem}>
                    <Text style={payStyles.summaryNum}>{totalPaid.toLocaleString("vi-VN")}đ</Text>
                    <Text style={payStyles.summaryLabel}>Đã thanh toán</Text>
                </View>
                <View style={payStyles.summaryDivider} />
                <View style={payStyles.summaryItem}>
                    <Text style={[payStyles.summaryNum, pendingCnt > 0 && { color: "#ffe082" }]}>
                        {pendingCnt}
                    </Text>
                    <Text style={payStyles.summaryLabel}>Chờ TT</Text>
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={payStyles.filterRow}
            >
                {STATUS_FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[payStyles.filterChip, filterStatus === f.key && payStyles.filterChipActive]}
                        onPress={() => setFilterStatus(f.key)}
                    >
                        <Text style={[payStyles.filterChipText, filterStatus === f.key && payStyles.filterChipTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {displayed.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <MaterialCommunityIcons name="receipt-text-outline" size={64} color={COLORS.textLight} />
                    <Text style={{ marginTop: 12, fontWeight: "600", color: COLORS.textMuted }}>
                        Chưa có giao dịch nào
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={displayed}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ padding: 16, paddingTop: 8 }}
                    renderItem={renderPayment}
                />
            )}
        </View>
    );
};


