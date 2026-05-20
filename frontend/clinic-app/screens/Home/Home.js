import {
    View, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, TextInput, StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

// ─── Danh sách tính năng nhanh ────────────────────────────────────────────────
const QUICK_ACTIONS = [
    { icon: "calendar-check-outline", label: "Đặt khám", screen: "doctor-list", bg: "#e3f2fd", color: "#1565c0" },
    { icon: "clipboard-text-clock-outline", label: "Lịch sử
đặt khám", screen: "my-appointments", bg: "#f3e5f5", color: "#7b1fa2" },
    { icon: "credit-card-outline", label: "Thanh toán
viện phí", screen: "payments", bg: "#fff3e0", color: "#ef6c00" },
    { icon: "receipt-text-outline", label: "Hoá đơn", screen: "payments", bg: "#e8f5e9", color: "#2e7d32" },
    { icon: "heart-pulse", label: "Hồ sơ
sức khoẻ", screen: "medical-records", bg: "#e0f7fa", color: "#00838f" },
    { icon: "flask-outline", label: "Kết quả
cận lâm sàng", screen: "medical-records", bg: "#fce4ec", color: "#c2185b" },
    { icon: "hospital-building", label: "Đăng ký
nhập viện", screen: "doctor-list", bg: "#e8eaf6", color: "#3949ab" },
    { icon: "pill", label: "Đơn thuốc", screen: "prescriptions", bg: "#fff8e1", color: "#f9a825" },
];

const SPECIALTIES = [
    { id: null, name: "Tất cả", icon: "hospital-box-outline" },
    { id: 1, name: "Tim mạch", icon: "heart-pulse" },
    { id: 2, name: "Thần kinh", icon: "brain" },
    { id: 3, name: "Cơ xương khớp", icon: "bone" },
    { id: 4, name: "Mắt", icon: "eye-outline" },
    { id: 5, name: "Hô hấp", icon: "lungs" },
    { id: 6, name: "Nhi", icon: "baby-face-outline" },
];

const STATUS_COLORS = {
    pending:   "#ff9800",
    confirmed: "#4caf50",
    cancelled: "#f44336",
    completed: "#2196f3",
    no_show:   "#9e9e9e",
};
const STATUS_LABELS = {
    pending:   "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
    completed: "Hoàn thành",
    no_show:   "Không đến",
};

// ─── Component ────────────────────────────────────────────────────────────────
const Home = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);

    const [specialties, setSpecialties]   = useState([]);
    const [loadingSpec, setLoadingSpec]   = useState(true);
    const [upcomingAppts, setUpcomingAppts] = useState([]);
    const [doctors, setDoctors]           = useState([]);
    const [search, setSearch]             = useState("");

    useEffect(() => {
        if (!user?.token) return;

        // Chuyên khoa
        authApis(user.token).get(endpoints["specialties"])
            .then(r => setSpecialties(r.data.results || r.data))
            .catch(console.error)
            .finally(() => setLoadingSpec(false));

        // Lịch hẹn sắp tới
        authApis(user.token)
            .get(endpoints["appointments"] + "?status=confirmed&status=pending")
            .then(r => setUpcomingAppts((r.data.results || r.data).slice(0, 2)))
            .catch(console.error);

        // Bác sĩ nổi bật
        authApis(user.token).get(endpoints["doctors"] + "?page=1")
            .then(r => setDoctors((r.data.results || r.data).slice(0, 3)))
            .catch(console.error);
    }, [user]);

    const handleSearch = () => {
        if (search.trim()) nav.navigate("doctor-list", { search });
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* ── HEADER ── */}
                <View style={styles.header}>
                    {/* Top row */}
                    <View style={styles.headerTop}>
                        <View style={styles.logoRow}>
                            <View style={styles.logoBox}>
                                <MaterialCommunityIcons name="hospital-building" size={18} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.appName}>ClinicCare</Text>
                                <Text style={styles.appSub}>Ứng dụng dành cho Người bệnh</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.bellBtn}
                            onPress={() => nav.navigate("notifications")}
                        >
                            <MaterialCommunityIcons name="bell-outline" size={20} color={COLORS.primaryDark} />
                        </TouchableOpacity>
                    </View>

                    {/* Greeting */}
                    <Text style={styles.greeting}>Xin chào,</Text>
                    <Text style={styles.userName}>
                        {user?.first_name || user?.username} 👋
                    </Text>
                    <Text style={styles.tagLine}>Chúc bạn một ngày sức khoẻ!</Text>
                </View>

                {/* ── SEARCH BAR nổi ── */}
                <View style={styles.searchWrap}>
                    <View style={styles.searchBar}>
                        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm bác sĩ, chuyên khoa, dịch vụ..."
                            placeholderTextColor={COLORS.textLight}
                            value={search}
                            onChangeText={setSearch}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                            <Text style={styles.searchBtnText}>Tìm</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── QUICK ACTIONS ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Chức năng</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-list")}>
                            <Text style={styles.sectionLink}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.quickGrid}>
                        {QUICK_ACTIONS.map((a, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.quickItem}
                                onPress={() => nav.navigate(a.screen)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.quickIconWrap, { backgroundColor: a.bg }]}>
                                    <MaterialCommunityIcons name={a.icon} size={26} color={a.color} />
                                </View>
                                <Text style={styles.quickLabel}>{a.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── LỊCH HẸN SẮP TỚI ── */}
                {upcomingAppts.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Lịch hẹn sắp tới</Text>
                            <TouchableOpacity onPress={() => nav.navigate("my-appointments")}>
                                <Text style={styles.sectionLink}>Xem tất cả</Text>
                            </TouchableOpacity>
                        </View>
                        {upcomingAppts.map(appt => (
                            <TouchableOpacity
                                key={appt.id}
                                style={styles.apptCard}
                                onPress={() => nav.navigate("appointment-detail", { id: appt.id })}
                                activeOpacity={0.85}
                            >
                                <View style={styles.apptAvatar}>
                                    <MaterialCommunityIcons name="doctor" size={28} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.apptDoctor}>
                                        BS. {appt.doctor_name || "Bác sĩ"}
                                    </Text>
                                    <Text style={styles.apptTime}>
                                        {new Date(appt.appointment_date).toLocaleString("vi-VN")}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.apptBadge,
                                    { backgroundColor: STATUS_COLORS[appt.status] + "33" },
                                ]}>
                                    <Text style={[
                                        styles.apptBadgeText,
                                        { color: STATUS_COLORS[appt.status] },
                                    ]}>
                                        {STATUS_LABELS[appt.status] || appt.status}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── CHUYÊN KHOA ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Chuyên khoa</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-list")}>
                            <Text style={styles.sectionLink}>Xem thêm</Text>
                        </TouchableOpacity>
                    </View>
                    {loadingSpec ? (
                        <ActivityIndicator color={COLORS.primary} />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {(specialties.length > 0 ? specialties : SPECIALTIES).map((s, i) => (
                                <TouchableOpacity
                                    key={s.id ?? i}
                                    style={styles.specChip}
                                    onPress={() => nav.navigate("doctor-list", {
                                        specialtyId: s.id,
                                        specialtyName: s.name,
                                    })}
                                    activeOpacity={0.75}
                                >
                                    <MaterialCommunityIcons name={s.icon || "hospital-box-outline"} size={18} color={COLORS.primary} />
                                    <Text style={styles.specText}>{s.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* ── BÁC SĨ NỔI BẬT ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Bác sĩ nổi bật</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-list")}>
                            <Text style={styles.sectionLink}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    {doctors.length === 0 ? (
                        <TouchableOpacity
                            style={[Styles.card, { alignItems: "center", paddingVertical: 24 }]}
                            onPress={() => nav.navigate("doctor-list")}
                        >
                            <MaterialCommunityIcons name="stethoscope" size={36} color={COLORS.primary} style={{ marginBottom: 8 }} />
                            <Text style={Styles.text}>Tìm bác sĩ phù hợp với bạn</Text>
                        </TouchableOpacity>
                    ) : (
                        doctors.map(doc => (
                            <TouchableOpacity
                                key={doc.id}
                                style={styles.docCard}
                                onPress={() => nav.navigate("doctor-detail", { doctorId: doc.id })}
                                activeOpacity={0.8}
                            >
                                <View style={styles.docAvatar}>
                                    <MaterialCommunityIcons name="doctor" size={28} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.docName}>BS. {doc.full_name}</Text>
                                    <Text style={styles.docSpec}>{doc.specialty_name || "Đa khoa"}</Text>
                                    <View style={Styles.row}>
                                        <View style={styles.docTag}>
                                            <Text style={styles.docTagText}>{doc.experience_years} năm KN</Text>
                                        </View>
                                        {doc.is_available && (
                                            <View style={[styles.docTag, { backgroundColor: "#e8f5e9", marginLeft: 6 }]}>
                                                <Text style={[styles.docTagText, { color: COLORS.greenLight }]}>● Nhận bệnh</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.docBtn}
                                    onPress={() => nav.navigate("book-appointment", {
                                        doctorId: doc.id,
                                        doctorName: doc.full_name,
                                    })}
                                >
                                    <Text style={styles.docBtnText}>Đặt khám</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* ── BANNER: THEO DÕI SỨC KHOẺ ── */}
                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                    <TouchableOpacity style={styles.healthBanner} activeOpacity={0.85}>
                        <Text style={{ fontSize: 36 }}>📊</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.healthTitle}>Theo dõi sức khoẻ tại nhà</Text>
                            <Text style={styles.healthSub}>
                                Ghi nhận huyết áp, đường huyết hàng ngày
                            </Text>
                        </View>
                        <View style={styles.healthBtn}>
                            <Text style={styles.healthBtnText}>Bắt đầu</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 24 }} />
            </ScrollView>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    /* Header */
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52,
        paddingHorizontal: 20,
        paddingBottom: 28,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoBox: {
        width: 38, height: 38,
        backgroundColor: "rgba(255,255,255,0.18)",
        borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    appName: { color: "#fff", fontSize: 16, fontWeight: "800" },
    appSub:  { color: "rgba(255,255,255,0.65)", fontSize: 10, marginTop: 1 },
    bellBtn: {
        width: 38, height: 38,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 19,
        alignItems: "center", justifyContent: "center",
    },
    greeting: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
    userName: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
    tagLine:  { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 },

    /* Search */
    searchWrap: { paddingHorizontal: 16, marginTop: -20, zIndex: 10 },
    searchBar: {
        backgroundColor: "#fff",
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
    searchBtn: {
        backgroundColor: COLORS.primaryPale,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    searchBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },

    /* Section */
    section: { paddingHorizontal: 16, paddingTop: 24 },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    sectionLink:  { fontSize: 12, fontWeight: "700", color: COLORS.primary },

    /* Quick grid */
    quickGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    quickItem: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 12,
        alignItems: "center",
        width: "22.5%",
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        gap: 8,
    },
    quickIconWrap: {
        width: 46, height: 46,
        borderRadius: 13,
        alignItems: "center", justifyContent: "center",
    },
    quickLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 14,
    },

    /* Appointment card */
    apptCard: {
        backgroundColor: COLORS.primaryDark,
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    apptAvatar: {
        width: 50, height: 50,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center", justifyContent: "center",
    },
    apptDoctor: { color: "#fff", fontSize: 14, fontWeight: "700" },
    apptTime:   { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4 },
    apptBadge: {
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    apptBadgeText: { fontSize: 10, fontWeight: "700" },

    /* Specialty chips */
    specChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        elevation: 1,
    },
    specText: { fontSize: 12, fontWeight: "600", color: COLORS.text },

    /* Doctor card */
    docCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
    },
    docAvatar: {
        width: 54, height: 54,
        borderRadius: 16,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center",
    },
    docName: { fontSize: 13, fontWeight: "700", color: COLORS.text },
    docSpec: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    docTag: {
        backgroundColor: COLORS.primaryPale,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 6,
        alignSelf: "flex-start",
    },
    docTagText: { fontSize: 10, fontWeight: "600", color: COLORS.primary },
    docBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    docBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    /* Health banner */
    healthBanner: {
        backgroundColor: "#e8f5e9",
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderWidth: 1.5,
        borderColor: "#a5d6a7",
    },
    healthTitle: { fontSize: 13, fontWeight: "700", color: COLORS.green },
    healthSub:   { fontSize: 11, color: "#388e3c", marginTop: 2 },
    healthBtn: {
        backgroundColor: COLORS.greenLight,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    healthBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

export default Home;