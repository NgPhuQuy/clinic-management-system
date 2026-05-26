/**
 * screens/Shared/StaffDoctorProfile.js
 * Màn hình hồ sơ cá nhân dùng chung cho bác sĩ và nhân viên y tế
 */
import {
    View, ScrollView, TouchableOpacity, Alert, Image,
} from "react-native";
import { Text } from "react-native-paper";
import { useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MyUserContext, MyDispatchContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const ROLE_CONFIG = {
    doctor: { label: "Bác sĩ",           icon: "stethoscope",   color: COLORS.primary, bg: COLORS.primaryDark },
    staff:  { label: "Nhân viên y tế",   icon: "account-heart",  color: COLORS.teal,    bg: COLORS.teal },
    admin:  { label: "Quản trị viên",    icon: "shield-crown",   color: COLORS.purple,  bg: COLORS.purple },
};

const MenuItem = ({ icon, label, onPress, color, isLast }) => (
    <TouchableOpacity
        style={[Styles.menuItem, isLast && Styles.menuItemLast]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[Styles.menuIcon, { backgroundColor: (color || COLORS.primary) + "20" }]}>
            <MaterialCommunityIcons name={icon} size={20} color={color || COLORS.primary} />
        </View>
        <Text style={Styles.menuLabel}>{label}</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
);

const StaffDoctorProfile = () => {
    const nav      = useNavigation();
    const user     = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);
    const { top }  = useSafeAreaInsets();

    const roleCfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.staff;

    const logout = () => {
        Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Đăng xuất",
                style: "destructive",
                onPress: async () => {
                    await AsyncStorage.removeItem("token");
                    dispatch({ type: "logout" });
                },
            },
        ]);
    };

    const displayName = [user?.last_name, user?.first_name].filter(Boolean).join(" ")
        || user?.username || user?.email;

    return (
        <ScrollView style={Styles.container}>
            {/* Profile header */}
            <View style={[styles.header, { backgroundColor: roleCfg.bg, paddingTop: top + 24 }]}>
                <View style={styles.avatarWrap}>
                    {avatarUri ? (
                        <Image
                            source={{ uri: avatarUri }}
                            style={styles.avatar}
                            onError={() => {}}
                        />
                    ) : (
                        <MaterialCommunityIcons name={roleCfg.icon} size={44} color="rgba(255,255,255,0.9)" />
                    )}
                </View>

                <Text style={Styles.profileName}>{displayName}</Text>
                <Text style={[Styles.headerSubtitle, { textAlign: "center" }]}>{user?.email}</Text>

                <View style={Styles.profileRoleTag}>
                    <MaterialCommunityIcons name={roleCfg.icon} size={13} color="#fff" />
                    <Text style={Styles.profileRoleText}>{roleCfg.label}</Text>
                </View>

                {/* Stats row */}
                <View style={Styles.profileInfoRow}>
                    {user?.role === "doctor" && (
                        <>
                            <View style={Styles.profileInfoItem}>
                                <Text style={Styles.profileInfoVal}>{user?.doctor_info?.experience_years ?? "–"}</Text>
                                <Text style={Styles.profileInfoLbl}>Năm KN</Text>
                            </View>
                            <View style={Styles.profileInfoItem}>
                                <Text style={Styles.profileInfoVal}>{user?.doctor_info?.specialty || "–"}</Text>
                                <Text style={Styles.profileInfoLbl}>Chuyên khoa</Text>
                            </View>
                        </>
                    )}
                    {user?.role === "staff" && (
                        <View style={Styles.profileInfoItem}>
                            <Text style={Styles.profileInfoVal}>{user?.staff_info?.position || roleCfg.label}</Text>
                            <Text style={Styles.profileInfoLbl}>Chức vụ</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Account info */}
            <View style={Styles.section}>
                <Text style={Styles.sectionTitle}>Thông tin tài khoản</Text>
                <View style={Styles.menuCard}>
                    {[
                        { icon: "account",       label: "Tên đăng nhập", value: user?.username },
                        { icon: "email-outline", label: "Email",          value: user?.email },
                        { icon: "shield-check",  label: "Vai trò",        value: roleCfg.label },
                    ].map(({ icon, label, value }, i, arr) => (
                        <View
                            key={label}
                            style={[
                                Styles.menuItem,
                                i === arr.length - 1 && Styles.menuItemLast,
                                { cursor: "default" },
                            ]}
                        >
                            <View style={[Styles.menuIcon, { backgroundColor: COLORS.primaryPale }]}>
                                <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary} />
                            </View>
                            <Text style={[Styles.menuLabel, { color: COLORS.textMuted, fontSize: 13 }]}>{label}</Text>
                            <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: "600", maxWidth: 160 }} numberOfLines={1}>
                                {value || "—"}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Settings */}
            <View style={Styles.section}>
                <Text style={Styles.sectionTitle}>Cài đặt</Text>
                <View style={Styles.menuCard}>
                    <MenuItem icon="lock-reset"   label="Đổi mật khẩu" color={COLORS.primary} onPress={() => nav.navigate("change-password")} />
                    <MenuItem icon="bell-outline" label="Thông báo"     color={COLORS.orange}  onPress={() => nav.navigate("notifications")} isLast />
                </View>
            </View>

            {/* Doctor quick links */}
            {user?.role === "doctor" && (
                <View style={Styles.section}>
                    <Text style={Styles.sectionTitle}>Chức năng bác sĩ</Text>
                    <View style={Styles.menuCard}>
                        <MenuItem icon="calendar-edit"        label="Quản lý lịch làm việc" color={COLORS.primary} onPress={() => nav.navigate("doctor-schedules")} />
                        <MenuItem icon="file-document-outline" label="Hồ sơ bệnh án"         color={COLORS.green}   onPress={() => nav.navigate("doctor-medical-records")} />
                        <MenuItem icon="pill"                  label="Đơn thuốc đã kê"       color={COLORS.orange}  onPress={() => nav.navigate("doctor-prescriptions")} isLast />
                    </View>
                </View>
            )}

            {/* Staff quick links */}
            {user?.role === "staff" && (
                <View style={Styles.section}>
                    <Text style={Styles.sectionTitle}>Chức năng nhân viên</Text>
                    <View style={Styles.menuCard}>
                        <MenuItem icon="package-variant" label="Quản lý kho thuốc" color={COLORS.teal}   onPress={() => nav.navigate("staff-inventory")} />
                        <MenuItem icon="cash-register"   label="Lịch sử thu tiền"  color={COLORS.orange} onPress={() => nav.navigate("staff-payments")} isLast />
                    </View>
                </View>
            )}

            {/* Logout */}
            <View style={{ margin: 16 }}>
                <TouchableOpacity
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: 14,
                        borderRadius: 14,
                        borderWidth: 1.5,
                        borderColor: COLORS.red,
                        backgroundColor: COLORS.redPale,
                    }}
                    onPress={logout}
                >
                    <MaterialCommunityIcons name="logout" size={20} color={COLORS.red} />
                    <Text style={{ color: COLORS.red, fontWeight: "700", fontSize: 15 }}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: 32 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        paddingTop: 24, paddingBottom: 32,
        alignItems: "center",
    },
    avatarWrap: { marginBottom: 14 },
    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: "rgba(255,255,255,0.5)" },
    avatarPlaceholder: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
    },
    name:       { fontSize: 22, fontWeight: "800", color: "#fff" },
    email:      { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
    roleBadge:  {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "rgba(255,255,255,0.9)",
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, marginTop: 12,
    },
    roleLabel:  { fontSize: 13, fontWeight: "700" },
    section:    { margin: 16, marginBottom: 0 },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
    infoCard: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 1,
    },
    infoRow:    { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
    infoLabel:  { fontSize: 13, color: COLORS.textMuted, marginLeft: 8, flex: 1 },
    infoValue:  { fontSize: 13, color: COLORS.text, fontWeight: "600" },
    menuCard:   { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 1 },
    menuItem:   { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
    menuIcon:   { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    menuLabel:  { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.text },
    divider:    { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
    logoutBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 10, backgroundColor: COLORS.redPale,
        borderRadius: 14, paddingVertical: 14,
    },
    logoutText: { fontSize: 15, fontWeight: "700", color: COLORS.red },
});

export default StaffDoctorProfile;
