import { View, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const STATUS_COLOR = { waiting: "#ff9800", active: "#4caf50", ended: "#9e9e9e" };
const STATUS_LABEL = { waiting: "Chờ bắt đầu", active: "Đang khám", ended: "Đã kết thúc" };

const DoctorConsultations = () => {
    const nav  = useNavigation();
    const user = useContext(MyUserContext);

    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["consultations"]);
            const data = res.data?.results ?? res.data ?? [];
            // Sắp xếp: waiting lên đầu, rồi active, rồi ended
            const order = { waiting: 0, active: 1, ended: 2 };
            setConsultations([...data].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const onRefresh = () => { setRefreshing(true); load(); };

    const renderItem = ({ item }) => {
        const isEnded = item.status === "ended";
        return (
            <TouchableOpacity
                style={[styles.card, isEnded && { opacity: 0.55 }]}
                onPress={() => nav.navigate("consultation-room", { consultationId: item.id })}
                activeOpacity={0.8}
                disabled={isEnded}
            >
                <View style={styles.cardLeft}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={styles.roomId}>Phòng: {item.room_id || `#${item.id}`}</Text>
                    <Text style={styles.apptId}>Lịch hẹn #{item.appointment}</Text>
                    {item.started_at && (
                        <Text style={Styles.textSmall}>
                            Bắt đầu: {new Date(item.started_at).toLocaleString("vi-VN")}
                        </Text>
                    )}
                    {item.duration_minutes && (
                        <Text style={Styles.textSmall}>Thời lượng: {item.duration_minutes} phút</Text>
                    )}
                </View>

                <View style={styles.cardRight}>
                    <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + "22" }]}>
                        <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                            {STATUS_LABEL[item.status]}
                        </Text>
                    </View>
                    {!isEnded && (
                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} style={{ marginTop: 8 }} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[Styles.center, { flex: 1 }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const active  = consultations.filter(c => c.status !== "ended");
    const ended   = consultations.filter(c => c.status === "ended");

    return (
        <FlatList
            style={{ backgroundColor: "#f5f7fa" }}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            data={consultations}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
                <View style={{ marginBottom: 8 }}>
                    <Text style={styles.sectionTitle}>
                        Đang hoạt động ({active.length})
                    </Text>
                </View>
            }
            ListEmptyComponent={
                <View style={[Styles.center, { paddingVertical: 60 }]}>
                    <MaterialCommunityIcons name="video-off-outline" size={48} color={COLORS.textLight} />
                    <Text style={[Styles.textMuted, { marginTop: 12 }]}>Chưa có phòng khám nào</Text>
                </View>
            }
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    cardLeft: { marginRight: 12 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    roomId: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    apptId: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    cardRight: { alignItems: "flex-end" },
    badge: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    badgeText: { fontSize: 11, fontWeight: "700" },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.5 },
});

export default DoctorConsultations;
