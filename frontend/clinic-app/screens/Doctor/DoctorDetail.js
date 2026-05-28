import { View, ScrollView, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";
import { doctorDetailStyles as S } from "./Styles";

const DoctorAvatarLarge = ({ uri }) => {
    const [error, setError] = useState(false);
    if (uri && !error) {
        return (
            <Image
                source={{ uri }}
                style={S.avatarCircle}
                onError={() => setError(true)}
            />
        );
    }
    return (
        <View style={[S.avatarCircle, { alignItems: "center", justifyContent: "center" }]}>
            <MaterialCommunityIcons name="doctor" size={52} color="#fff" />
        </View>
    );
};

const InfoItem = ({ icon, label, value, iconColor = COLORS.primary }) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: iconColor + "18", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: COLORS.textLight, fontWeight: "600" }}>{label}</Text>
            <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: "500", marginTop: 1 }}>{value}</Text>
        </View>
    </View>
);

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
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

    if (!doctor) return (
        <View style={[Styles.center, { flex: 1 }]}>
            <Text>Không tìm thấy thông tin bác sĩ</Text>
        </View>
    );

    const isAvailable = doctor.is_available;

    return (
        <ScrollView style={Styles.container}>
            <View style={S.header}>
                <DoctorAvatarLarge uri={doctor.avatar || doctor.avatar_url} />
                <Text style={S.name}>BS. {doctor.full_name}</Text>
                <Text style={S.specialty}>{doctor.specialty_name || "Đa khoa"}</Text>

                <View style={S.statsRow}>
                    <View style={S.statItem}>
                        <Text style={S.statNum}>{doctor.experience_years ?? "–"}</Text>
                        <Text style={S.statLabel}>Năm KN</Text>
                    </View>
                    <View style={S.statDivider} />
                    <View style={S.statItem}>
                        <Text style={[S.statNum, { fontSize: 12 }]} numberOfLines={1} adjustsFontSizeToFit>
                            {Number(doctor.consultation_fee || 0).toLocaleString("vi-VN")}đ
                        </Text>
                        <Text style={S.statLabel}>Phí khám</Text>
                    </View>
                    <View style={S.statDivider} />
                    <View style={S.statItem}>
                        <MaterialCommunityIcons
                            name={isAvailable ? "check-circle-outline" : "close-circle-outline"}
                            size={20}
                            color={isAvailable ? "#a5d6a7" : "#ef9a9a"}
                        />
                        <Text style={S.statLabel}>{isAvailable ? "Nhận bệnh" : "Hết ca"}</Text>
                    </View>
                </View>
            </View>

            <View style={Styles.padding}>
                {doctor.bio ? (
                    <View style={[Styles.card, { marginBottom: 12 }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <MaterialCommunityIcons name="text-account" size={18} color={COLORS.primary} />
                            <Text style={Styles.sectionHeader}>Giới thiệu</Text>
                        </View>
                        <Text style={Styles.text}>{doctor.bio}</Text>
                    </View>
                ) : null}

                <View style={[Styles.card, { marginBottom: 12 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <MaterialCommunityIcons name="stethoscope" size={18} color={COLORS.primary} />
                        <Text style={Styles.sectionHeader}>Thông tin chuyên môn</Text>
                    </View>
                    <InfoItem icon="card-account-details-outline" label="Chứng chỉ hành nghề" value={doctor.license_number || "Chưa cập nhật"} />
                    <InfoItem icon="hospital-building" label="Chuyên khoa" value={doctor.specialty_name || "Đa khoa"} iconColor={COLORS.teal} />
                    {doctor.education ? (
                        <InfoItem icon="school-outline" label="Học vấn" value={doctor.education} iconColor={COLORS.purple} />
                    ) : null}
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <MaterialCommunityIcons name="calendar-clock-outline" size={18} color={COLORS.primary} />
                    <Text style={Styles.sectionHeader}>Lịch làm việc có sẵn</Text>
                </View>

                {schedules.length === 0 ? (
                    <View style={[Styles.card, Styles.center, { paddingVertical: 24 }]}>
                        <MaterialCommunityIcons name="calendar-blank-outline" size={40} color={COLORS.textLight} />
                        <Text style={[Styles.text, { marginTop: 8 }]}>Hiện chưa có lịch trống</Text>
                    </View>
                ) : (
                    schedules.map((s) => (
                        <TouchableOpacity
                            key={s.id}
                            style={[Styles.card, { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 12 }]}
                            onPress={() => nav.navigate("book-appointment", {
                                doctorId,
                                scheduleId: s.id,
                                doctorName: doctor.full_name,
                                doctorAvatar: doctor.avatar || doctor.avatar_url,
                                schedule: s,
                            })}
                            activeOpacity={0.75}
                        >
                            <View style={{ backgroundColor: COLORS.primaryPale, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", minWidth: 60 }}>
                                <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.primary }}>
                                    {new Date(s.date).toLocaleDateString("vi-VN", { weekday: "short" }).replace("Thứ ", "T")}
                                </Text>
                                <Text style={{ fontSize: 22, fontWeight: "900", color: COLORS.primaryDark, lineHeight: 26 }}>
                                    {new Date(s.date).getDate()}
                                </Text>
                                <Text style={{ fontSize: 10, color: COLORS.textMuted }}>
                                    {`Th.${new Date(s.date).getMonth() + 1}`}
                                </Text>
                            </View>

                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 }}>
                                    <MaterialCommunityIcons name="clock-outline" size={13} color={COLORS.textMuted} />
                                    <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}>
                                        {s.start_time} – {s.end_time}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                    <MaterialCommunityIcons name="account-group-outline" size={13} color={COLORS.textMuted} />
                                    <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                                        Tối đa {s.max_appointments} ca
                                    </Text>
                                </View>
                            </View>

                            <View style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}>
                                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Đặt lịch</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <TouchableOpacity
                    style={[Styles.btnPrimary, { flexDirection: "row", gap: 8, marginTop: 4 }]}
                    onPress={() => nav.navigate("book-appointment", {
                        doctorId,
                        doctorName: doctor.full_name,
                        doctorAvatar: doctor.avatar || doctor.avatar_url,
                    })}
                    activeOpacity={0.85}
                >
                    <MaterialCommunityIcons name="calendar-plus" size={18} color="#fff" />
                    <Text style={Styles.btnPrimaryText}>Đặt lịch hẹn với bác sĩ này</Text>
                </TouchableOpacity>

                <View style={{ height: 16 }} />
            </View>
        </ScrollView>
    );
};

export default DoctorDetail;
