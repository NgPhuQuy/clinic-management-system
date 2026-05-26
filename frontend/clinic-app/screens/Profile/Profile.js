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
    const nav      = useNavigation();
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

            <View style={PS.header}>
                <UserAvatar uri={avatarUri} size={84} iconName="account" borderRadius={24} />
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

// ─── Payments ─────────────────────────────────────────────────────────────────
// Luồng: danh sách invoice → bấm vào invoice → modal chọn PT → xác nhận TT tiền mặt
const PAY_STATUS_CFG = {
    pending:  { label: "Chờ thanh toán", color: COLORS.orange  },
    success:  { label: "Đã thanh toán",  color: COLORS.green   },
    failed:   { label: "Thất bại",       color: COLORS.red     },
    refunded: { label: "Hoàn tiền",      color: COLORS.purple  },
};
const PAY_METHOD_LABELS = {
    momo: "Ví MoMo", vnpay: "VNPay QR", cash: "Tiền mặt",
    banking: "Chuyển khoản", credit_card: "Thẻ tín dụng",
};

const MOCK_INVOICES = [
    { id:1,  appointment_id:1,  doctor_name:"BS. Nguyễn Văn An",  amount:"450000", status:"pending",  payment_method:"cash",    created_at: new Date(Date.now()-1*86400*1000).toISOString() },
    { id:2,  appointment_id:2,  doctor_name:"BS. Lê Minh Cường",   amount:"320000", status:"success",  payment_method:"momo",    created_at: new Date(Date.now()-3*86400*1000).toISOString(), paid_at: new Date(Date.now()-3*86400*1000).toISOString() },
    { id:3,  appointment_id:3,  doctor_name:"BS. Phạm Thị Dung",   amount:"700000", status:"pending",  payment_method:"cash",    created_at: new Date(Date.now()-2*86400*1000).toISOString() },
    { id:4,  appointment_id:4,  doctor_name:"BS. Hoàng Văn Em",    amount:"250000", status:"success",  payment_method:"vnpay",   created_at: new Date(Date.now()-7*86400*1000).toISOString(), paid_at: new Date(Date.now()-7*86400*1000).toISOString() },
    { id:5,  appointment_id:5,  doctor_name:"BS. Vũ Thị Phương",   amount:"280000", status:"pending",  payment_method:"cash",    created_at: new Date(Date.now()-1*3600*1000).toISOString() },
    { id:6,  appointment_id:6,  doctor_name:"BS. Nguyễn Văn An",   amount:"550000", status:"refunded", payment_method:"momo",    created_at: new Date(Date.now()-10*86400*1000).toISOString() },
];

const PAYMENT_METHODS = [
    { key:"cash",  label:"Tiền mặt",  sub:"Thanh toán tại quầy thu ngân",      icon:"cash",        iconBg: COLORS.greenPale, iconColor: COLORS.green },
    { key:"momo",  label:"Ví MoMo",   sub:"Thanh toán qua ứng dụng MoMo",      icon:"wallet",      iconBg: "#ae2070",        iconColor: "#fff" },
    { key:"vnpay", label:"VNPay QR",  sub:"Quét mã QR hoặc Internet Banking",  icon:"qrcode-scan", iconBg: "#005baf",        iconColor: "#fff" },
];

// Modal xác nhận thanh toán tiền mặt
const CashConfirmModal = ({ invoice, onClose, onConfirm }) => {
    const [loading, setLoading] = useState(false);
    if (!invoice) return null;
    return (
        <View style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
        }}>
            <View style={{
                backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
                padding: 24, paddingBottom: 36,
            }}>
                {/* Handle */}
                <View style={{ width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />

                <View style={{ alignItems: "center", marginBottom: 20 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.greenPale, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                        <MaterialCommunityIcons name="cash" size={32} color={COLORS.green} />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.text }}>Thanh toán tiền mặt</Text>
                    <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: "center" }}>
                        Xác nhận đặt lịch thanh toán tại quầy thu ngân
                    </Text>
                </View>

                {/* Invoice info */}
                <View style={{ backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 }}>
                    {[
                        { label: "Bác sĩ",      value: invoice.doctor_name },
                        { label: "Số hoá đơn",  value: `#${invoice.id}` },
                        { label: "Số tiền",     value: `${Number(invoice.amount).toLocaleString("vi-VN")}đ`, bold: true },
                    ].map(r => (
                        <View key={r.label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontSize: 13, color: COLORS.textMuted }}>{r.label}</Text>
                            <Text style={{ fontSize: 13, color: r.bold ? COLORS.primary : COLORS.text, fontWeight: r.bold ? "800" : "600" }}>{r.value}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ backgroundColor: "#e8f5e9", borderRadius: 10, padding: 12, marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, color: COLORS.green, lineHeight: 20 }}>
                        ℹ️ Sau khi xác nhận, vui lòng đến quầy thu ngân để hoàn tất thanh toán. Nhân viên sẽ thu tiền và cấp biên lai.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[Styles.btnPrimary, { backgroundColor: COLORS.green, marginBottom: 10 }]}
                    onPress={async () => {
                        setLoading(true);
                        await onConfirm(invoice);
                        setLoading(false);
                    }}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={Styles.btnPrimaryText}>✓ Xác nhận thanh toán tiền mặt</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity style={Styles.btnOutline} onPress={onClose}>
                    <Text style={Styles.btnOutlineText}>Hủy</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export const Payments = () => {
    const nav  = useNavigation();
    const user = useContext(MyUserContext);

    const [invoices,       setInvoices]       = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [selectedInvoice, setSelected]      = useState(null); // invoice đang chọn phương thức
    const [selectedMethod, setMethod]         = useState(null);
    const [showCash,       setShowCash]       = useState(false);
    const [filterStatus,   setFilterStatus]   = useState("all");

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

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            {/* Filter tabs */}
            <View style={{ flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                {STATUS_FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={{
                            flex: 1, paddingVertical: 12, alignItems: "center",
                            borderBottomWidth: 2.5,
                            borderBottomColor: filterStatus === f.key ? COLORS.primary : "transparent",
                        }}
                        onPress={() => setFilterStatus(f.key)}
                    >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: filterStatus === f.key ? COLORS.primary : COLORS.textMuted }}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Invoice list */}
            <FlatList
                data={displayed}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                ListEmptyComponent={
                    <View style={Styles.emptyWrap}>
                        <MaterialCommunityIcons name="credit-card-outline" size={52} color={COLORS.border} />
                        <Text style={Styles.emptyText}>Chưa có giao dịch nào</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const sCfg = PAY_STATUS_CFG[item.status] || {};
                    const isPending = item.status === "pending";
                    return (
                        <TouchableOpacity
                            style={[PS.invoiceCard, isPending && { borderWidth: 1.5, borderColor: COLORS.primary + "40" }]}
                            onPress={() => openInvoice(item)}
                            activeOpacity={isPending ? 0.8 : 1}
                        >
                            <View style={PS.invoiceTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={PS.invoiceNum}>Hoá đơn #{item.id}</Text>
                                    <Text style={PS.invoiceDoc}>{item.doctor_name}</Text>
                                </View>
                                <View style={[Styles.badge, { backgroundColor: sCfg.color + "20", alignSelf: "flex-start" }]}>
                                    <Text style={[Styles.badgeText, { color: sCfg.color }]}>{sCfg.label}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 }}>
                                <View>
                                    <Text style={PS.invoiceAmt}>{Number(item.amount).toLocaleString("vi-VN")}đ</Text>
                                    <Text style={PS.invoiceDate}>
                                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                                        {item.payment_method ? ` • ${PAY_METHOD_LABELS[item.payment_method] || item.payment_method}` : ""}
                                    </Text>
                                </View>
                                {isPending && (
                                    <View style={{
                                        flexDirection: "row", alignItems: "center", gap: 4,
                                        backgroundColor: COLORS.primary, borderRadius: 8,
                                        paddingHorizontal: 10, paddingVertical: 6,
                                    }}>
                                        <MaterialCommunityIcons name="credit-card-outline" size={14} color="#fff" />
                                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Thanh toán</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Payment method sheet (khi bấm vào invoice pending) */}
            {selectedInvoice && !showCash && (
                <View style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
                }}>
                    <View style={{
                        backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
                        padding: 24, paddingBottom: 36,
                    }}>
                        <View style={{ width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
                        <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.text, marginBottom: 4 }}>
                            Thanh toán hoá đơn #{selectedInvoice.id}
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: COLORS.primary, marginBottom: 16 }}>
                            {Number(selectedInvoice.amount).toLocaleString("vi-VN")}đ
                        </Text>

                        <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.textLight, letterSpacing: 0.8, marginBottom: 10 }}>
                            CHỌN PHƯƠNG THỨC
                        </Text>

                        {PAYMENT_METHODS.map(m => {
                            const sel = selectedMethod === m.key;
                            return (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[PS.methodCard, sel && PS.methodCardSelected]}
                                    onPress={() => setMethod(m.key)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[PS.methodIcon, { backgroundColor: m.iconBg }]}>
                                        <MaterialCommunityIcons name={m.icon} size={22} color={m.iconColor} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={[PS.methodLabel, sel && { color: COLORS.primary }]}>{m.label}</Text>
                                        <Text style={PS.methodSub}>{m.sub}</Text>
                                    </View>
                                    <View style={[PS.radio, sel && PS.radioSelected]}>
                                        {sel && <View style={PS.radioDot} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity
                            style={[Styles.btnPrimary, (!selectedMethod) && { opacity: 0.5 }, { marginTop: 8 }]}
                            onPress={proceedPayment}
                            disabled={!selectedMethod}
                        >
                            <Text style={Styles.btnPrimaryText}>
                                {selectedMethod === "cash" ? "Xác nhận tiền mặt →" : "Tiến hành thanh toán →"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={Styles.btnOutline} onPress={() => { setSelected(null); setMethod(null); }}>
                            <Text style={Styles.btnOutlineText}>Hủy</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Cash confirm modal */}
            {showCash && (
                <CashConfirmModal
                    invoice={selectedInvoice}
                    onClose={() => { setShowCash(false); setSelected(null); setMethod(null); }}
                    onConfirm={confirmCash}
                />
            )}
        </View>
    );
};
export default Profile;