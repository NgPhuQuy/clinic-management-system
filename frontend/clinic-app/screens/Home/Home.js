import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { Text, Card } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles from "../../styles/Styles";

const QUICK_ACTIONS = [
    { icon: "📅", label: "Đặt lịch hẹn", screen: "book-appointment" },
    { icon: "🩺", label: "Tìm bác sĩ", screen: "doctor-list" },
    { icon: "📋", label: "Lịch sử khám", screen: "my-appointments" },
    { icon: "💊", label: "Đơn thuốc", screen: "prescriptions" },
    { icon: "🧾", label: "Thanh toán", screen: "payments" },
    { icon: "📂", label: "Hồ sơ bệnh án", screen: "medical-records" },
];

const Home = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [specialties, setSpecialties] = useState([]);
    const [loadingSpec, setLoadingSpec] = useState(true);
    const [upcomingAppts, setUpcomingAppts] = useState([]);

    useEffect(() => {
        const loadSpecialties = async () => {
            try {
                const res = await authApis(user?.token).get(endpoints["specialties"]);
                setSpecialties(res.data.results || res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingSpec(false);
            }
        };
        const loadAppointments = async () => {
            try {
                const res = await authApis(user?.token).get(endpoints["appointments"] + "?status=confirmed&status=pending");
                setUpcomingAppts((res.data.results || res.data).slice(0, 3));
            } catch (e) {
                console.error(e);
            }
        };

        if (user?.token) {
            loadSpecialties();
            loadAppointments();
        }
    }, [user]);

    const getStatusColor = (status) => {
        const map = { pending: "#ff9800", confirmed: "#4caf50", cancelled: "#f44336", completed: "#2196f3", no_show: "#9e9e9e" };
        return map[status] || "#9e9e9e";
    };

    const getStatusLabel = (status) => {
        const map = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã hủy", completed: "Hoàn thành", no_show: "Không đến" };
        return map[status] || status;
    };

    return (
        <ScrollView style={Styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Xin chào, {user?.first_name || user?.username} 👋</Text>
                    <Text style={styles.subtitle}>Chúc bạn một ngày tốt lành!</Text>
                </View>
                <TouchableOpacity onPress={() => nav.navigate("notifications")}>
                    <Text style={styles.bell}>🔔</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={Styles.padding}>
                <Text style={Styles.sectionHeader}>Tính năng</Text>
                <View style={styles.quickGrid}>
                    {QUICK_ACTIONS.map((a) => (
                        <TouchableOpacity
                            key={a.screen}
                            style={styles.quickItem}
                            onPress={() => nav.navigate(a.screen)}
                        >
                            <Text style={styles.quickIcon}>{a.icon}</Text>
                            <Text style={styles.quickLabel}>{a.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Upcoming Appointments */}
            {upcomingAppts.length > 0 && (
                <View style={Styles.padding}>
                    <Text style={Styles.sectionHeader}>Lịch hẹn sắp tới</Text>
                    {upcomingAppts.map((appt) => (
                        <TouchableOpacity
                            key={appt.id}
                            style={Styles.card}
                            onPress={() => nav.navigate("appointment-detail", { id: appt.id })}
                        >
                            <View style={Styles.row}>
                                <Text style={{ fontSize: 24, marginRight: 12 }}>📅</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={Styles.subtitle}>BS. {appt.doctor_name || "Bác sĩ"}</Text>
                                    <Text style={Styles.text}>{new Date(appt.appointment_date).toLocaleString("vi-VN")}</Text>
                                    <View style={[Styles.badge, { backgroundColor: getStatusColor(appt.status), marginTop: 4 }]}>
                                        <Text style={Styles.badgeText}>{getStatusLabel(appt.status)}</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => nav.navigate("my-appointments")}>
                        <Text style={styles.viewAll}>Xem tất cả →</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Specialties */}
            <View style={Styles.padding}>
                <Text style={Styles.sectionHeader}>Chuyên khoa</Text>
                {loadingSpec ? (
                    <ActivityIndicator color="#1565c0" />
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {specialties.map((s) => (
                            <TouchableOpacity
                                key={s.id}
                                style={styles.specialtyChip}
                                onPress={() => nav.navigate("doctor-list", { specialtyId: s.id, specialtyName: s.name })}
                            >
                                <Text style={styles.specialtyText}>{s.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            <View style={{ height: 24 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: "#1565c0",
        padding: 20,
        paddingTop: 48,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    greeting: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    subtitle: {
        color: "#bbdefb",
        fontSize: 13,
    },
    bell: {
        fontSize: 24,
    },
    quickGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    quickItem: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
        width: "30%",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    quickIcon: {
        fontSize: 26,
        marginBottom: 6,
    },
    quickLabel: {
        fontSize: 11,
        textAlign: "center",
        color: "#333",
        fontWeight: "500",
    },
    viewAll: {
        color: "#1565c0",
        fontWeight: "600",
        marginTop: 6,
    },
    specialtyChip: {
        backgroundColor: "#e3f2fd",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#90caf9",
    },
    specialtyText: {
        color: "#1565c0",
        fontWeight: "600",
        fontSize: 13,
    },
});

export default Home;
