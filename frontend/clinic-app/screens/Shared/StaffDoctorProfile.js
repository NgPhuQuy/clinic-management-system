import {
    View, ScrollView, TouchableOpacity, Alert, Image,
    ActivityIndicator, StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { useContext, useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MyUserContext, MyDispatchContext } from "../../contexts/MyContext";
import { authApis, endpoints } from "../../configs/Apis";
import Styles, { COLORS, profileStyles as PS } from "../../styles/Styles";

const ROLE_CONFIG = {
    doctor: { label: "Bác sĩ", icon: "stethoscope", bg: COLORS.primaryDark },
    staff: { label: "Nhân viên y tế", icon: "account-heart", bg: "#00695c" },
    admin: { label: "Quản trị viên", icon: "shield-crown", bg: COLORS.purple },
};

const Avatar = ({ uri, size = 84, icon = "account", borderRadius }) => {
    const [err, setErr] = useState(false);
    const br = borderRadius ?? size / 2;
    if (uri && !err) return (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: br }} onError={() => setErr(true)} />
    );
    return (
        <View style={{
            width: size, height: size, borderRadius: br,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center",
            borderWidth: 2.5, borderColor: "rgba(255,255,255,0.4)",
        }}>
            <MaterialCommunityIcons name={icon} size={size * 0.52} color="#fff" />
        </View>
    );
};

const InfoRow = ({ icon, label, value, last }) => (
    <View style={[PS.infoRow, last && { borderBottomWidth: 0 }]}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} style={{ width: 28 }} />
        <Text style={PS.infoLabel}>{label}</Text>
        <Text style={PS.infoValue}>{value || "—"}</Text>
    </View>
);

const MenuRow = ({ icon, bg, color, label, sub, onPress, last }) => (
    <TouchableOpacity style={[PS.menuRow, last && { borderBottomWidth: 0 }]} onPress={onPress} activeOpacity={0.7}>
        <View style={[PS.menuIcon, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon} size={20} color={color || COLORS.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={PS.menuLabel}>{label}</Text>
            {sub ? <Text style={PS.menuSub}>{sub}</Text> : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
);

const StaffDoctorProfile = () => {
    const user = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);
    const nav = useNavigation();
    const { top } = useSafeAreaInsets();

    const [stats, setStats] = useState({ appointments: 0, records: 0 });

    const roleCfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.staff;
    const avatarUri = user?.avatar_url || user?.avatar || null;
    const displayName = [user?.last_name, user?.first_name].filter(Boolean).join(" ")
        || user?.username || user?.email;

    useEffect(() => {
        if (!user?.token) return;
        if (user.role === "doctor") {
            authApis(user.token).get(endpoints["appointments"])
                .then(r => {
                    const d = r.data.results || r.data;
                    setStats({ appointments: d.length, records: 0 });
                })
                .catch(() => { });
        }
    }, []);

    const logout = () => Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
        { text: "Hủy", style: "cancel" },
        {
            text: "Đăng xuất", style: "destructive",
            onPress: async () => {
                await AsyncStorage.multiRemove(["token", "token_scope"]);
                dispatch({ type: "logout" });
            },
        },
    ]);

    const isDoctor = user?.role === "doctor";
    const isStaff = user?.role === "staff";

    return (
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" backgroundColor={roleCfg.bg} />

            <View style={[PS.header, { backgroundColor: roleCfg.bg, paddingTop: top + 16 }]}>
                <Avatar uri={avatarUri} size={84} icon={roleCfg.icon} borderRadius={24} />
                <Text style={PS.name}>{displayName}</Text>
                <View style={PS.roleBadge}>
                    <Text style={PS.roleText}>{roleCfg.label}</Text>
                </View>
                <Text style={PS.email}>{user?.email}</Text>
            </View>

            <View style={PS.statsRow}>
                {isDoctor ? (
                    <>
                        <View style={PS.statItem}>
                            <Text style={PS.statNum}>{user?.doctor_info?.experience_years ?? "–"}</Text>
                            <Text style={PS.statLabel}>Năm KN</Text>
                        </View>
                        <View style={[PS.statItem, PS.statBorder]}>
                            <Text style={[PS.statNum, { fontSize: 14 }]} numberOfLines={1} adjustsFontSizeToFit>
                                {user?.doctor_info?.specialty || "–"}
                            </Text>
                            <Text style={PS.statLabel}>Chuyên khoa</Text>
                        </View>
                        <View style={PS.statItem}>
                            <Text style={PS.statNum}>{stats.appointments}</Text>
                            <Text style={PS.statLabel}>Lịch hẹn</Text>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={PS.statItem}>
                            <Text style={[PS.statNum, { fontSize: 14 }]} numberOfLines={1} adjustsFontSizeToFit>
                                {user?.staff_info?.position || "NV"}
                            </Text>
                            <Text style={PS.statLabel}>Chức vụ</Text>
                        </View>
                        <View style={[PS.statItem, PS.statBorder]}>
                            <Text style={[PS.statNum, { fontSize: 13 }]} numberOfLines={1} adjustsFontSizeToFit>
                                {roleCfg.label}
                            </Text>
                            <Text style={PS.statLabel}>Vai trò</Text>
                        </View>
                        <View style={PS.statItem}>
                            <Text style={PS.statNum}>{user?.id ? `#${user.id}` : "–"}</Text>
                            <Text style={PS.statLabel}>Mã NV</Text>
                        </View>
                    </>
                )}
            </View>

            {isDoctor && (user?.doctor_info?.license_number || user?.doctor_info?.specialty) ? (
                <View style={PS.section}>
                    <Text style={PS.sectionTitle}>THÔNG TIN CHUYÊN MÔN</Text>
                    <View style={PS.card}>
                        {user?.doctor_info?.license_number ? (
                            <InfoRow icon="card-account-details-outline" label="Chứng chỉ" value={user.doctor_info.license_number} />
                        ) : null}
                        {user?.doctor_info?.specialty ? (
                            <InfoRow icon="hospital-building" label="Chuyên khoa" value={user.doctor_info.specialty} />
                        ) : null}
                        {user?.doctor_info?.consultation_fee ? (
                            <InfoRow icon="currency-usd" label="Phí khám" value={`${Number(user.doctor_info.consultation_fee).toLocaleString("vi-VN")}đ`} last />
                        ) : null}
                    </View>
                </View>
            ) : null}

            <View style={PS.section}>
                <Text style={PS.sectionTitle}>TÀI KHOẢN</Text>
                <View style={PS.card}>
                    <InfoRow icon="account-outline" label="Tên đăng nhập" value={user?.username} />
                    <InfoRow icon="email-outline" label="Email" value={user?.email} />
                    <InfoRow icon="shield-check" label="Vai trò" value={roleCfg.label} last />
                </View>
            </View>

            {isDoctor && (
                <View style={PS.section}>
                    <Text style={PS.sectionTitle}>CHỨC NĂNG</Text>
                    <View style={PS.card}>
                        <MenuRow icon="calendar-edit" bg="#e3f2fd" color={COLORS.primary} label="Lịch làm việc" sub="Xem và quản lý ca trực" onPress={() => nav.navigate("doctor-schedules")} />
                        <MenuRow icon="file-document-outline" bg="#e8f5e9" color={COLORS.green} label="Hồ sơ bệnh án" sub="Bệnh án đã xử lý" onPress={() => nav.navigate("doctor-medical-records")} />
                        <MenuRow icon="pill" bg="#fff3e0" color={COLORS.orange} label="Đơn thuốc đã kê" sub="Theo dõi đơn thuốc" onPress={() => nav.navigate("doctor-prescriptions")} last />
                    </View>
                </View>
            )}

            {isStaff && (
                <View style={PS.section}>
                    <Text style={PS.sectionTitle}>CHỨC NĂNG</Text>
                    <View style={PS.card}>
                        <MenuRow icon="package-variant" bg="#e0f7fa" color={COLORS.teal} label="Quản lý kho thuốc" sub="Tồn kho, cảnh báo hết hạn" onPress={() => nav.navigate("staff-inventory")} />
                        <MenuRow icon="cash-register" bg="#fff3e0" color={COLORS.orange} label="Lịch sử thu tiền" sub="Tra cứu giao dịch thanh toán" onPress={() => nav.navigate("staff-payments")} last />
                    </View>
                </View>
            )}

            <View style={PS.section}>
                <Text style={PS.sectionTitle}>CÀI ĐẶT</Text>
                <View style={PS.card}>
                    <MenuRow icon="bell-outline" bg="#fff3e0" color={COLORS.orange} label="Thông báo" sub="Xem tin nhắn hệ thống" onPress={() => nav.navigate("notifications")} />
                    <MenuRow icon="lock-outline" bg="#fce4ec" color={COLORS.red} label="Đổi mật khẩu" sub="Bảo mật tài khoản" onPress={() => nav.navigate("change-password")} last />
                </View>
            </View>

            <View style={PS.section}>
                <Text style={PS.sectionTitle}>HỖ TRỢ</Text>
                <View style={PS.card}>
                    <MenuRow icon="phone-in-talk-outline" bg="#e3f2fd" color={COLORS.primary} label="Liên hệ hỗ trợ" sub="Hotline: 1900 1234" onPress={() => { }} last />
                </View>
            </View>

            <TouchableOpacity style={[PS.logoutBtn, { margin: 16 }]} onPress={logout}>
                <MaterialCommunityIcons name="logout" size={20} color="#f44336" />
                <Text style={PS.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
        </ScrollView>
    );
};

export default StaffDoctorProfile;
