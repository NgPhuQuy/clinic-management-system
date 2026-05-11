import { View, ScrollView, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Text, Button, TextInput } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext, MyDispatchContext } from "../../contexts/MyContext";
import Styles from "../../styles/Styles";

export const Profile = () => {
    const user = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);
    const nav = useNavigation();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // Try to get patient profile
                const patientsRes = await authApis(user.token).get(endpoints["patients"] + "?me=true");
                const data = patientsRes.data.results || patientsRes.data;
                if (data.length > 0) setPatient(data[0]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const logout = async () => {
        await AsyncStorage.removeItem("token");
        dispatch({ type: "logout" });
    };

    const ROLE_LABELS = { patient: "Bệnh nhân", doctor: "Bác sĩ", staff: "Nhân viên", admin: "Quản trị viên" };

    return (
        <ScrollView style={Styles.container}>
            {/* Avatar and basic info */}
            <View style={styles.header}>
                <View style={styles.avatarCircle}>
                    <Text style={{ fontSize: 48 }}>👤</Text>
                </View>
                <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
                <Text style={styles.role}>{ROLE_LABELS[user?.role] || user?.role}</Text>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            <View style={Styles.padding}>
                {/* Patient specific info */}
                {patient && (
                    <View style={Styles.card}>
                        <Text style={Styles.sectionHeader}>Thông tin bệnh nhân</Text>
                        <InfoRow icon="📞" label="Điện thoại" value={patient.phone || "Chưa cập nhật"} />
                        <InfoRow icon="🎂" label="Ngày sinh" value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("vi-VN") : "Chưa cập nhật"} />
                        <InfoRow icon="⚧" label="Giới tính" value={patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : "Chưa cập nhật"} />
                        <InfoRow icon="🏠" label="Địa chỉ" value={patient.address || "Chưa cập nhật"} />
                        <InfoRow icon="💉" label="Nhóm máu" value={patient.blood_type || "Chưa cập nhật"} />
                        <InfoRow icon="🆔" label="Số BHYT" value={patient.insurance_number || "Chưa cập nhật"} />
                    </View>
                )}

                {/* Menu items */}
                <View style={Styles.card}>
                    <Text style={Styles.sectionHeader}>Tài khoản</Text>
                    <MenuRow icon="🔒" label="Đổi mật khẩu" onPress={() => nav.navigate("change-password")} />
                    <MenuRow icon="📂" label="Hồ sơ bệnh án" onPress={() => nav.navigate("medical-records")} />
                    <MenuRow icon="💊" label="Đơn thuốc của tôi" onPress={() => nav.navigate("prescriptions")} />
                    <MenuRow icon="💳" label="Lịch sử thanh toán" onPress={() => nav.navigate("payments")} />
                </View>

                <Button
                    mode="outlined"
                    onPress={logout}
                    style={{ borderRadius: 8, borderColor: "#f44336" }}
                    textColor="#f44336"
                    icon="logout"
                >
                    Đăng xuất
                </Button>
            </View>
        </ScrollView>
    );
};

const InfoRow = ({ icon, label, value }) => (
    <View style={[Styles.row, { marginBottom: 8 }]}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>{icon}</Text>
        <Text style={[Styles.textSmall, { width: 80 }]}>{label}:</Text>
        <Text style={[Styles.text, { flex: 1 }]}>{value}</Text>
    </View>
);

const MenuRow = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
        <Text style={{ fontSize: 18, marginRight: 12 }}>{icon}</Text>
        <Text style={[Styles.text, { flex: 1 }]}>{label}</Text>
        <Text style={{ color: "#9e9e9e" }}>›</Text>
    </TouchableOpacity>
);

// Prescriptions Screen
export const Prescriptions = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await authApis(user.token).get(endpoints["prescriptions"]);
                setPrescriptions(res.data.results || res.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color="#1565c0" /></View>;

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
                        <TouchableOpacity style={Styles.card} onPress={() => nav.navigate("prescription-detail", { id: item.id })}>
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

    useEffect(() => {
        const load = async () => {
            try {
                const res = await authApis(user.token).get(endpoints["payments"]);
                setPayments(res.data.results || res.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const PAYMENT_COLORS = { pending: "#ff9800", completed: "#4caf50", failed: "#f44336", refunded: "#9c27b0" };
    const PAYMENT_LABELS = { pending: "Chờ thanh toán", completed: "Đã thanh toán", failed: "Thất bại", refunded: "Hoàn tiền" };

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color="#1565c0" /></View>;

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
                                    {item.payment_method && <Text style={Styles.textSmall}>Phương thức: {item.payment_method}</Text>}
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
        backgroundColor: "#1565c0",
        padding: 32,
        alignItems: "center",
    },
    avatarCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    name: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    role: {
        color: "#bbdefb",
        fontSize: 13,
        marginTop: 4,
    },
    email: {
        color: "#e3f2fd",
        fontSize: 12,
        marginTop: 2,
    },
    menuRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
});
