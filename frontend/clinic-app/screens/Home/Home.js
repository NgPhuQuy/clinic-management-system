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
import Styles, { COLORS, homeStyles as S } from "../../styles/Styles";

// ─── Danh sách tính năng nhanh ────────────────────────────────────────────────
const QUICK_ACTIONS = [
    { icon: "calendar-check-outline", label: "Đặt khám", screen: "doctor-list", bg: "#e3f2fd", color: "#1565c0" },
    { icon: "clipboard-text-clock-outline", label: "Lịch sử đặt khám", screen: "my-appointments", bg: "#f3e5f5", color: "#7b1fa2" },
    { icon: "credit-card-outline", label: "Thanh toán viện phí", screen: "payments", bg: "#fff3e0", color: "#ef6c00" },
    { icon: "receipt-text-outline", label: "Hoá đơn", screen: "payments", bg: "#e8f5e9", color: "#2e7d32" },
    { icon: "heart-pulse", label: "Hồ sơ sức khoẻ", screen: "medical-records", bg: "#e0f7fa", color: "#00838f" },
    { icon: "flask-outline", label: "Kết quả cận lâm sàng", screen: "medical-records", bg: "#fce4ec", color: "#c2185b" },
    { icon: "hospital-building", label: "Đăng ký nhập viện", screen: "doctor-list", bg: "#e8eaf6", color: "#3949ab" },
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
                <View style={S.header}>
                    {/* Top row */}
                    <View style={S.headerTop}>
                        <View style={S.logoRow}>
                            <View style={S.logoBox}>
                                <MaterialCommunityIcons name="hospital-building" size={18} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={S.appName}>ClinicCare</Text>
                                <Text style={S.appSub}>Ứng dụng dành cho Người bệnh</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={S.bellBtn}
                            onPress={() => nav.navigate("notifications")}
                        >
                            <MaterialCommunityIcons name="bell-outline" size={20} color={COLORS.primaryDark} />
                        </TouchableOpacity>
                    </View>

                    {/* Greeting */}
                    <Text style={S.greeting}>Xin chào,</Text>
                    <Text style={S.userName}>
                        {user?.first_name || user?.username} 👋
                    </Text>
                    <Text style={S.tagLine}>Chúc bạn một ngày sức khoẻ!</Text>
                </View>

                {/* ── SEARCH BAR nổi ── */}
                <View style={S.searchWrap}>
                    <View style={S.searchBar}>
                        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
                        <TextInput
                            style={S.searchInput}
                            placeholder="Tìm bác sĩ, chuyên khoa, dịch vụ..."
                            placeholderTextColor={COLORS.textLight}
                            value={search}
                            onChangeText={setSearch}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        <TouchableOpacity style={S.searchBtn} onPress={handleSearch}>
                            <Text style={S.searchBtnText}>Tìm</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── QUICK ACTIONS ── */}
                <View style={S.section}>
                    <View style={S.sectionHeader}>
                        <Text style={S.sectionTitle}>Chức năng</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-list")}>
                            <Text style={S.sectionLink}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={S.quickGrid}>
                        {QUICK_ACTIONS.map((a, i) => (
                            <TouchableOpacity
                                key={i}
                                style={S.quickItem}
                                onPress={() => nav.navigate(a.screen)}
                                activeOpacity={0.75}
                            >
                                <View style={[S.quickIconWrap, { backgroundColor: a.bg }]}>
                                    <MaterialCommunityIcons name={a.icon} size={26} color={a.color} />
                                </View>
                                <Text style={S.quickLabel}>{a.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── LỊCH HẸN SẮP TỚI ── */}
                {upcomingAppts.length > 0 && (
                    <View style={S.section}>
                        <View style={S.sectionHeader}>
                            <Text style={S.sectionTitle}>Lịch hẹn sắp tới</Text>
                            <TouchableOpacity onPress={() => nav.navigate("my-appointments")}>
                                <Text style={S.sectionLink}>Xem tất cả</Text>
                            </TouchableOpacity>
                        </View>
                        {upcomingAppts.map(appt => (
                            <TouchableOpacity
                                key={appt.id}
                                style={S.apptCard}
                                onPress={() => nav.navigate("appointment-detail", { id: appt.id })}
                                activeOpacity={0.85}
                            >
                                <View style={S.apptAvatar}>
                                    <MaterialCommunityIcons name="doctor" size={28} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={S.apptDoctor}>
                                        BS. {appt.doctor_name || "Bác sĩ"}
                                    </Text>
                                    <Text style={S.apptTime}>
                                        {new Date(appt.appointment_date).toLocaleString("vi-VN")}
                                    </Text>
                                </View>
                                <View style={[
                                    S.apptBadge,
                                    { backgroundColor: STATUS_COLORS[appt.status] + "33" },
                                ]}>
                                    <Text style={[
                                        S.apptBadgeText,
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
                <View style={S.section}>
                    <View style={S.sectionHeader}>
                        <Text style={S.sectionTitle}>Chuyên khoa</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-list")}>
                            <Text style={S.sectionLink}>Xem thêm</Text>
                        </TouchableOpacity>
                    </View>
                    {loadingSpec ? (
                        <ActivityIndicator color={COLORS.primary} />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {(specialties.length > 0 ? specialties : SPECIALTIES).map((s, i) => (
                                <TouchableOpacity
                                    key={s.id ?? i}
                                    style={S.specChip}
                                    onPress={() => nav.navigate("doctor-list", {
                                        specialtyId: s.id,
                                        specialtyName: s.name,
                                    })}
                                    activeOpacity={0.75}
                                >
                                    <MaterialCommunityIcons name={s.icon || "hospital-box-outline"} size={18} color={COLORS.primary} />
                                    <Text style={S.specText}>{s.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* ── BÁC SĨ NỔI BẬT ── */}
                <View style={S.section}>
                    <View style={S.sectionHeader}>
                        <Text style={S.sectionTitle}>Bác sĩ nổi bật</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-list")}>
                            <Text style={S.sectionLink}>Xem tất cả</Text>
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
                                style={S.docCard}
                                onPress={() => nav.navigate("doctor-detail", { doctorId: doc.id })}
                                activeOpacity={0.8}
                            >
                                <View style={S.docAvatar}>
                                    <MaterialCommunityIcons name="doctor" size={28} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={S.docName}>BS. {doc.full_name}</Text>
                                    <Text style={S.docSpec}>{doc.specialty_name || "Đa khoa"}</Text>
                                    <View style={Styles.row}>
                                        <View style={S.docTag}>
                                            <Text style={S.docTagText}>{doc.experience_years} năm KN</Text>
                                        </View>
                                        {doc.is_available && (
                                            <View style={[S.docTag, { backgroundColor: "#e8f5e9", marginLeft: 6 }]}>
                                                <Text style={[S.docTagText, { color: COLORS.greenLight }]}>● Nhận bệnh</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={S.docBtn}
                                    onPress={() => nav.navigate("book-appointment", {
                                        doctorId: doc.id,
                                        doctorName: doc.full_name,
                                    })}
                                >
                                    <Text style={S.docBtnText}>Đặt khám</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* ── BANNER: THEO DÕI SỨC KHOẺ ── */}
                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                    <TouchableOpacity style={S.healthBanner} activeOpacity={0.85}>
                        <Text style={{ fontSize: 36 }}>📊</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={S.healthTitle}>Theo dõi sức khoẻ tại nhà</Text>
                            <Text style={S.healthSub}>
                                Ghi nhận huyết áp, đường huyết hàng ngày
                            </Text>
                        </View>
                        <View style={S.healthBtn}>
                            <Text style={S.healthBtnText}>Bắt đầu</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 24 }} />
            </ScrollView>
        </View>
    );
};
export default Home;
// ─── Styles ───────────────────────────────────────────────────────────────────
