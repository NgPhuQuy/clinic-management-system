import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const DoctorAvatarLarge = ({ uri }) => {
    const [error, setError] = useState(false);
    if (uri && !error) {
        return (
            <Image
                source={{ uri }}
                style={styles.avatarCircle}
                onError={() => setError(true)}
            />
        );
    }
    return (
        <View style={[styles.avatarCircle, { alignItems: "center", justifyContent: "center" }]}>
            <MaterialCommunityIcons name="doctor" size={52} color="#fff" />
        </View>
    );
};

const DoctorDetail = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { doctorId } = route.params;

    const [doctor, setDoctor] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [docRes, schRes] = await Promise.all([
                    authApis(user.token).get(endpoints["doctor-detail"](doctorId)),
                    authApis(user.token).get(endpoints["doctor-schedules"](doctorId)),
                ]);
                setDoctor(docRes.data);
                setSchedules(schRes.data.results || schRes.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [doctorId]);

    if (loading) return (
        <View style={[Styles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color="#1565c0" />
        </View>
    );

    if (!doctor) return (
        <View style={[Styles.center, { flex: 1 }]}>
            <Text>Không tìm thấy thông tin bác sĩ</Text>
        </View>
    );

    return (
        <ScrollView style={Styles.container}>
            {/* Doctor Header */}
            <View style={styles.header}>
                <DoctorAvatarLarge uri={doctor.avatar || doctor.avatar_url} />
                <Text style={styles.name}>BS. {doctor.full_name}</Text>
                <Text style={styles.specialty}>{doctor.specialty_name || "Đa khoa"}</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{doctor.experience_years}</Text>
                        <Text style={styles.statLabel}>Năm KN</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{Number(doctor.consultation_fee || 0).toLocaleString("vi-VN")}đ</Text>
                        <Text style={styles.statLabel}>Phí khám</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{doctor.is_available ? "✅" : "❌"}</Text>
                        <Text style={styles.statLabel}>Nhận bệnh</Text>
                    </View>
                </View>
            </View>

            <View style={Styles.padding}>
                {/* Bio */}
                {doctor.bio ? (
                    <View style={Styles.card}>
                        <Text style={Styles.sectionHeader}>Giới thiệu</Text>
                        <Text style={Styles.text}>{doctor.bio}</Text>
                    </View>
                ) : null}

                {/* License */}
                <View style={Styles.card}>
                    <Text style={Styles.sectionHeader}>Thông tin chuyên môn</Text>
                    <Text style={Styles.text}>🪪 Số chứng chỉ: {doctor.license_number}</Text>
                    <Text style={[Styles.text, { marginTop: 4 }]}>🏥 Chuyên khoa: {doctor.specialty_name || "Đa khoa"}</Text>
                </View>

                {/* Schedules */}
                <Text style={Styles.sectionHeader}>Lịch làm việc có sẵn</Text>
                {schedules.length === 0 ? (
                    <View style={[Styles.card, Styles.center]}>
                        <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
                        <Text style={Styles.text}>Hiện chưa có lịch trống</Text>
                    </View>
                ) : (
                    schedules.map((s) => (
                        <TouchableOpacity
                            key={s.id}
                            style={[Styles.card, styles.scheduleItem]}
                            onPress={() => nav.navigate("book-appointment", { doctorId, scheduleId: s.id, doctorName: doctor.full_name, schedule: s })}
                        >
                            <View>
                                <Text style={Styles.subtitle}>📅 {new Date(s.date).toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</Text>
                                <Text style={Styles.text}>🕐 {s.start_time} – {s.end_time}</Text>
                                <Text style={Styles.textSmall}>Số ca tối đa: {s.max_appointments}</Text>
                            </View>
                            <View style={[Styles.badge, { backgroundColor: "#4caf50" }]}>
                                <Text style={Styles.badgeText}>Đặt lịch</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <Button
                    mode="contained"
                    buttonColor="#1565c0"
                    style={{ borderRadius: 8, marginTop: 8 }}
                    onPress={() => nav.navigate("book-appointment", { doctorId, doctorName: doctor.full_name })}
                >
                    Đặt lịch hẹn với bác sĩ này
                </Button>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: "#1565c0",
        padding: 24,
        alignItems: "center",
        paddingTop: 32,
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
    specialty: {
        color: "#bbdefb",
        marginTop: 4,
    },
    statsRow: {
        flexDirection: "row",
        marginTop: 20,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 12,
        padding: 12,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statNum: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#fff",
    },
    statLabel: {
        fontSize: 11,
        color: "#bbdefb",
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: "rgba(255,255,255,0.3)",
    },
    scheduleItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
});

export default DoctorDetail;