import { View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text, Chip } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles from "../../styles/Styles";
import { myAppointmentsStyles as S } from "./Styles";

const STATUS_FILTERS = [
    { label: "Tất cả", value: null },
    { label: "Chờ thanh toán", value: "pending" },
    { label: "Đã xác nhận", value: "confirmed" },
    { label: "Hoàn thành", value: "completed" },
    { label: "Đã hủy", value: "cancelled" },
];

const STATUS_COLORS = {
    pending: "#ff9800",
    confirmed: "#4caf50",
    cancelled: "#f44336",
    completed: "#2196f3",
    no_show: "#9e9e9e",
};

const STATUS_LABELS = {
    pending: "Chờ thanh toán",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
    completed: "Hoàn thành",
    no_show: "Không đến",
};

const MyAppointments = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [appointments, setAppointments] = useState([]);
    const [filter, setFilter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        setAppointments([]);
        setPage(1);
        setHasMore(true);
        load(1, filter);
    }, [filter]);

    const load = async (p = 1, f = filter) => {
        if (!hasMore && p > 1) return;
        try {
            setLoading(true);
            let url = endpoints["appointments"] + `?page=${p}`;
            if (f) url += `&status=${f}`;
            const res = await authApis(user.token).get(url);
            const data = res.data.results || res.data;
            if (p === 1) {
                setAppointments(data);
            } else {
                setAppointments(prev => [...prev, ...data]);
            }
            setHasMore(!!res.data.next);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={Styles.card}
            onPress={() => nav.navigate("appointment-detail", { id: item.id })}
        >
            <View style={S.header}>
                <Text style={Styles.subtitle}>BS. {item.doctor_name || "Bác sĩ"}</Text>
                <View style={[Styles.badge, { backgroundColor: STATUS_COLORS[item.status] || "#9e9e9e" }]}>
                    <Text style={Styles.badgeText}>{STATUS_LABELS[item.status] || item.status}</Text>
                </View>
            </View>
            <View style={Styles.divider} />
            <Text style={Styles.text}>📅 {new Date(item.appointment_date).toLocaleString("vi-VN")}</Text>
            {item.reason ? <Text style={Styles.textSmall} numberOfLines={1}>Lý do: {item.reason}</Text> : null}
        </TouchableOpacity>
    );

    return (
        <View style={Styles.container}>
            <View style={S.filterRow}>
                {STATUS_FILTERS.map((f) => (
                    <Chip
                        key={f.label}
                        selected={filter === f.value}
                        onPress={() => setFilter(f.value)}
                        style={[S.chip, filter === f.value && S.chipSelected]}
                        textStyle={filter === f.value ? { color: "#fff", fontSize: 12 } : { fontSize: 12 }}
                    >
                        {f.label}
                    </Chip>
                ))}
            </View>

            {loading && appointments.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color="#1565c0" />
                </View>
            ) : appointments.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <Text style={[Styles.text, { marginTop: 8 }]}>Chưa có lịch hẹn nào</Text>
                </View>
            ) : (
                <FlatList
                    data={appointments}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                    onEndReached={() => {
                        if (hasMore && !loading) {
                            const next = page + 1;
                            setPage(next);
                            load(next);
                        }
                    }}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loading ? <ActivityIndicator color="#1565c0" style={{ marginVertical: 12 }} /> : null}
                />
            )}
        </View>
    );
};

export default MyAppointments;