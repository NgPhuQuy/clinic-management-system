import { View, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, StatusBar, Alert } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";
import { homeStyles } from "./Styles";

const QUICK_ACTIONS = [
    { icon: "calendar-check-outline",       label: "Đặt khám",              screen: "specialty-select", bg: "#e3f2fd", color: "#1565c0" },
    { icon: "clipboard-text-clock-outline", label: "Lịch sử đặt khám",      screen: "my-appointments",  bg: "#f3e5f5", color: "#7b1fa2" },
    { icon: "receipt-text-outline",         label: "Hoá đơn",               screen: "payments",         bg: "#e8f5e9", color: "#2e7d32" },
    { icon: "heart-pulse",                  label: "Hồ sơ sức khoẻ",        screen: "medical-records",  bg: "#e0f7fa", color: "#00838f" },
    { icon: "pill",                         label: "Đơn thuốc",             screen: "prescriptions",    bg: "#fff8e1", color: "#f9a825" },
    { icon: "credit-card-outline",          label: "Thanh toán viện phí",   dev: true,                  bg: "#fff3e0", color: "#ef6c00" },
    { icon: "flask-outline",                label: "Kết quả cận lâm sàng",  screen: "test-results",     bg: "#fce4ec", color: "#c2185b" },
    { icon: "hospital-building",            label: "Đăng ký nhập viện",     dev: true,                  bg: "#e8eaf6", color: "#3949ab" },
];

const SPECIALTIES = [
    { id: null, name: "Tất cả",       icon: "hospital-box-outline" },
    { id: 1,    name: "Tim mạch",     icon: "heart-pulse" },
    { id: 2,    name: "Thần kinh",    icon: "brain" },
    { id: 3,    name: "Cơ xương khớp", icon: "bone" },
    { id: 4,    name: "Mắt",          icon: "eye-outline" },
    { id: 5,    name: "Hô hấp",       icon: "lungs" },
    { id: 6,    name: "Nhi",          icon: "baby-face-outline" },
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

const Home = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const { top } = useSafeAreaInsets();

    const [specialties, setSpecialties]     = useState([]);
    const [loadingSpec, setLoadingSpec]     = useState(true);
    const [upcomingAppts, setUpcomingAppts] = useState([]);
    const [doctors, setDoctors]             = useState([]);
    const [search, setSearch]               = useState("");

    useEffect(() => {
        if (!user?.token) return;

        authApis(user.token).get(endpoints["specialties"])
            .then(r => setSpecialties(r.data.results || r.data))
            .catch(console.error)
            .finally(() => setLoadingSpec(false));

        authApis(user.token)
            .get(endpoints["appointments"] + "?status=confirmed&status=pending")
            .then(r => setUpcomingAppts((r.data.results || r.data).slice(0, 2)))
            .catch(console.error);

        authApis(user.token).get(endpoints["doctors"] + "?page=1")
            .then(r => setDoctors((r.data.results || r.data).slice(0, 3)))
            .catch(console.error);
    }, [user]);

    const handleSearch = () => {
        if (search.trim()) nav.navigate("doctor-list", { search });
    };

    return (
        <View style={Styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
            <ScrollView showsVerticalScrollIndicator={false}>

                <View style={[homeStyles.header, { paddingTop: top + 16 }]}>
                    <View style={homeStyles.headerTop}>
                        <View style={homeStyles.logoRow}>
                            <View style={homeStyles.logoBox}>
                                <MaterialCommunityIcons name="hospital-building" size={18} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={homeStyles.appName}>ClinicCare</Text>
                                <Text style={homeStyles.appSub}>Ứng dụng dành cho Người bệnh</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={homeStyles.bellBtn}
                            onPress={() => nav.navigate("notifications")}
                        >
                            <MaterialCommunityIcons name="bell-outline" size={20} color={COLORS.primaryDark} />
                        </TouchableOpacity>
                    </View>

                    <Text style={homeStyles.greeting}>Xin chào,</Text>
                    <Text style={homeStyles.userName}>{user?.first_name || user?.username}</Text>
                    <Text style={homeStyles.tagLine}>Chúc bạn một ngày tốt lành!</Text>
                </View>

                <View style={homeStyles.searchWrap}>
                    <View style={homeStyles.searchBar}>
                        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
                        <TextInput
                            style={homeStyles.searchInput}
                            placeholder="Chức năng"
                            placeholderTextColor={COLORS.textLight}
                            value={search}
                            onChangeText={setSearch}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        <TouchableOpacity style={homeStyles.searchBtn} onPress={handleSearch}>
                            <Text style={homeStyles.searchBtnText}>Tìm</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={homeStyles.section}>
                    <View style={homeStyles.sectionHeader}>
                        <Text style={homeStyles.sectionTitle}>Chức năng</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-list")}>
                            <Text style={homeStyles.sectionLink}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={homeStyles.quickGrid}>
                        {QUICK_ACTIONS.map((a, i) => (
                            <TouchableOpacity
                                key={i}
                                style={homeStyles.quickItem}
                                onPress={() => {
                                    if (a.dev) {
                                        Alert.alert("Đang phát triển", "Chức năng này sẽ sớm được cập nhật trong phiên bản tiếp theo.");
                                    } else {
                                        nav.navigate(a.screen);
                                    }
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={[homeStyles.quickIconWrap, { backgroundColor: a.bg }]}>
                                    <MaterialCommunityIcons name={a.icon} size={26} color={a.color} />
                                </View>
                                <Text style={homeStyles.quickLabel}>{a.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {upcomingAppts.length > 0 && (
                    <View style={homeStyles.section}>
                        <View style={homeStyles.sectionHeader}>
                            <Text style={homeStyles.sectionTitle}>Lịch hẹn sắp tới</Text>
                            <TouchableOpacity onPress={() => nav.navigate("my-appointments")}>
                                <Text style={homeStyles.sectionLink}>Xem tất cả</Text>
                            </TouchableOpacity>
                        </View>
                        {upcomingAppts.map(appt => (
                            <TouchableOpacity
                                key={appt.id}
                                style={homeStyles.apptCard}
                                onPress={() => nav.navigate("appointment-detail", { id: appt.id })}
                                activeOpacity={0.85}
                            >
                                <View style={homeStyles.apptAvatar}>
                                    <MaterialCommunityIcons name="doctor" size={28} color={COLORS.primary} />
                                </View>
                                <View style={Styles.flex1}>
                                    <Text style={homeStyles.apptDoctor}>
                                        BS. {appt.doctor_name || "Bác sĩ"}
                                    </Text>
                                    <Text style={homeStyles.apptTime}>
                                        {new Date(appt.appointment_date).toLocaleString("vi-VN")}
                                    </Text>
                                </View>
                                <View style={[homeStyles.apptBadge, { backgroundColor: STATUS_COLORS[appt.status] + "33" }]}>
                                    <Text style={[homeStyles.apptBadgeText, { color: STATUS_COLORS[appt.status] }]}>
                                        {STATUS_LABELS[appt.status] || appt.status}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={homeStyles.section}>
                    <View style={homeStyles.sectionHeader}>
                        <Text style={homeStyles.sectionTitle}>Chuyên khoa</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-list")}>
                            <Text style={homeStyles.sectionLink}>Xem thêm</Text>
                        </TouchableOpacity>
                    </View>
                    {loadingSpec ? (
                        <ActivityIndicator color={COLORS.primary} />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {(specialties.length > 0 ? specialties : SPECIALTIES).map((s, i) => (
                                <TouchableOpacity
                                    key={s.id ?? i}
                                    style={homeStyles.specChip}
                                    onPress={() => nav.navigate("doctor-list", {
                                        specialtyId: s.id,
                                        specialtyName: s.name,
                                    })}
                                    activeOpacity={0.75}
                                >
                                    <MaterialCommunityIcons name={s.icon || "hospital-box-outline"} size={18} color={COLORS.primary} />
                                    <Text style={homeStyles.specText}>{s.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                <View style={homeStyles.section}>
                    <View style={homeStyles.sectionHeader}>
                        <Text style={homeStyles.sectionTitle}>Bác sĩ nổi bật</Text>
                        <TouchableOpacity onPress={() => nav.navigate("doctor-list")}>
                            <Text style={homeStyles.sectionLink}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    {doctors.length === 0 ? (
                        <TouchableOpacity
                            style={[Styles.card, homeStyles.docEmptyCard]}
                            onPress={() => nav.navigate("doctor-list")}
                        >
                            <MaterialCommunityIcons name="stethoscope" size={36} color={COLORS.primary} style={homeStyles.iconMb} />
                            <Text style={Styles.text}>Tìm bác sĩ phù hợp với bạn</Text>
                        </TouchableOpacity>
                    ) : (
                        doctors.map(doc => (
                            <TouchableOpacity
                                key={doc.id}
                                style={homeStyles.docCard}
                                onPress={() => nav.navigate("doctor-detail", { doctorId: doc.id })}
                                activeOpacity={0.8}
                            >
                                <View style={homeStyles.docAvatar}>
                                    <MaterialCommunityIcons name="doctor" size={28} color={COLORS.primary} />
                                </View>
                                <View style={Styles.flex1}>
                                    <Text style={homeStyles.docName}>BS. {doc.full_name}</Text>
                                    <Text style={homeStyles.docSpec}>{doc.specialty_name || "Đa khoa"}</Text>
                                    <View style={Styles.row}>
                                        <View style={homeStyles.docTag}>
                                            <Text style={homeStyles.docTagText}>{doc.experience_years} năm KN</Text>
                                        </View>
                                        {doc.is_available && (
                                            <View style={homeStyles.docTagAvail}>
                                                <Text style={homeStyles.docTagAvailText}>● Nhận bệnh</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={homeStyles.docBtn}
                                    onPress={() => nav.navigate("book-appointment", {
                                        doctorId: doc.id,
                                        doctorName: doc.full_name,
                                    })}
                                >
                                    <Text style={homeStyles.docBtnText}>Đặt khám</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={homeStyles.bannerWrap}>
                    <TouchableOpacity style={homeStyles.healthBanner} activeOpacity={0.85}>
                        <Text style={homeStyles.bannerEmoji}>📊</Text>
                        <View style={Styles.flex1}>
                            <Text style={homeStyles.healthTitle}>Theo dõi sức khoẻ tại nhà</Text>
                            <Text style={homeStyles.healthSub}>
                                Ghi nhận huyết áp, đường huyết hàng ngày
                            </Text>
                        </View>
                        <View style={homeStyles.healthBtn}>
                            <Text style={homeStyles.healthBtnText}>Bắt đầu</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={homeStyles.spacerMd} />
            </ScrollView>
        </View>
    );
};

export default Home;
