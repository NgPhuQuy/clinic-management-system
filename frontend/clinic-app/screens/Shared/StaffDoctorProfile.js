/**
 * screens/Shared/StaffDoctorProfile.js
 * Màn hình hồ sơ cá nhân dùng chung cho bác sĩ và nhân viên y tế:
 *   - Xem thông tin tài khoản
 *   - Đổi mật khẩu
 *   - Đăng xuất
 */
import {
    View, ScrollView, StyleSheet, TouchableOpacity,
    Alert, Image,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MyUserContext, MyDispatchContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const ROLE_CONFIG = {
    doctor: {
        label: "Bác sĩ",
        icon:  "stethoscope",
        color: COLORS.primary,
        bg:    COLORS.primaryDark,
    },
    staff: {
        label: "Nhân viên y tế",
        icon:  "account-heart",
        color: COLORS.teal,
        bg:    COLORS.teal,
    },
    admin: {
        label: "Quản trị viên",
        icon:  "shield-crown",
        color: COLORS.purple,
        bg:    COLORS.purple,
    },
};

const MenuItem = ({ icon, label, onPress, color, rightIcon }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.menuIcon, { backgroundColor: (color || COLORS.primary) + "20" }]}>
            <MaterialCommunityIcons name={icon} size={20} color={color || COLORS.primary} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
        <MaterialCommunityIcons
            name={rightIcon || "chevron-right"}
            size={20}
            color={COLORS.textLight}
        />
    </TouchableOpacity>
);

const StaffDoctorProfile = () => {
    const nav      = useNavigation();
    const user     = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);

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

    const avatarUri = user?.avatar;

    return (
        <ScrollView style={styles.container}>
            {/* Profile header */}
            <View style={[styles.header, { backgroundColor: roleCfg.bg }]}>
                <View style={styles.avatarWrap}>
                    {avatarUri ? (
                        <Image
                            source={{ uri: avatarUri }}
                            style={styles.avatar}
                            onError={() => {}}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <MaterialCommunityIcons
                                name={roleCfg.icon}
                                size={44}
                                color={roleCfg.color}
                            />
                        </View>
                    )}
                </View>

                <Text style={styles.name}>
                    {user?.first_name || user?.username || user?.email}
                </Text>
                <Text style={styles.email}>{user?.email}</Text>

                <View style={styles.roleBadge}>
                    <MaterialCommunityIcons name={roleCfg.icon} size={14} color={roleCfg.color} />
                    <Text style={[styles.roleLabel, { color: roleCfg.color }]}>
                        {roleCfg.label}
                    </Text>
                </View>
            </View>

            {/* Account info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>

                <View style={styles.infoCard}>
                    {[
                        { icon: "account",       label: "Tên đăng nhập", value: user?.username },
                        { icon: "email-outline", label: "Email",          value: user?.email },
                        { icon: "shield-check",  label: "Vai trò",        value: roleCfg.label },
                    ].map(({ icon, label, value }) => (
                        <View key={label} style={styles.infoRow}>
                            <MaterialCommunityIcons name={icon} size={16} color={COLORS.primary} style={{ width: 22 }} />
                            <Text style={styles.infoLabel}>{label}</Text>
                            <Text style={styles.infoValue}>{value || "—"}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Menu */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cài đặt</Text>
                <View style={styles.menuCard}>
                    <MenuItem
                        icon="lock-reset"
                        label="Đổi mật khẩu"
                        color={COLORS.primary}
                        onPress={() => nav.navigate("change-password")}
                    />
                    <View style={styles.divider} />
                    <MenuItem
                        icon="bell-outline"
                        label="Thông báo"
                        color={COLORS.orange}
                        onPress={() => nav.navigate("notifications")}
                    />
                </View>
            </View>

            {/* Role-specific quick links */}
            {user?.role === "doctor" && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bác sĩ</Text>
                    <View style={styles.menuCard}>
                        <MenuItem
                            icon="calendar-edit"
                            label="Quản lý lịch làm việc"
                            color={COLORS.primary}
                            onPress={() => nav.navigate("doctor-schedules")}
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon="file-document-outline"
                            label="Hồ sơ bệnh án của tôi"
                            color={COLORS.green}
                            onPress={() => nav.navigate("doctor-medical-records")}
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon="pill"
                            label="Đơn thuốc đã kê"
                            color={COLORS.orange}
                            onPress={() => nav.navigate("doctor-prescriptions")}
                        />
                    </View>
                </View>
            )}

            {user?.role === "staff" && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Nhân viên y tế</Text>
                    <View style={styles.menuCard}>
                        <MenuItem
                            icon="package-variant"
                            label="Quản lý kho thuốc"
                            color={COLORS.teal}
                            onPress={() => nav.navigate("staff-inventory")}
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon="cash-register"
                            label="Lịch sử thu tiền"
                            color={COLORS.orange}
                            onPress={() => nav.navigate("staff-payments")}
                        />
                    </View>
                </View>
            )}

            {/* Logout */}
            <View style={{ margin: 16 }}>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <MaterialCommunityIcons name="logout" size={20} color={COLORS.red} />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: 32 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        paddingTop: 56, paddingBottom: 32,
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