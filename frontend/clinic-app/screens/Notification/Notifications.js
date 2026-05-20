import {
    View, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const TYPE_MAP = {
    appointment_reminder: { icon: "📅", bg: "#e8f5e9" },
    prescription:         { icon: "💊", bg: "#fff3e0" },
    payment:              { icon: "💳", bg: "#f3e5f5" },
    lab_result:           { icon: "🔬", bg: "#e0f7fa" },
    general:              { icon: "🔔", bg: "#e3f2fd" },
};

const Notifications = () => {
    const user = useContext(MyUserContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("all");

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            if (!user?.token) return;
            const res = await authApis(user.token).get(endpoints["notifications"]);
            setNotifications(res.data.results || res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const markRead = async (id) => {
        try {
            await authApis(user.token).patch(endpoints["notification-read"](id), {});
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) { console.error(e); }
    };

    const markAllRead = async () => {
        try {
            await authApis(user.token).patch(endpoints["notification-read-all"], {});
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) { console.error(e); }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;
    const displayed = tab === "unread" ? notifications.filter(n => !n.is_read) : notifications;

    const renderItem = ({ item }) => {
        const t = TYPE_MAP[item.notification_type] || TYPE_MAP.general;
        return (
            <TouchableOpacity
                style={[styles.item, !item.is_read && styles.itemUnread]}
                onPress={() => markRead(item.id)}
                activeOpacity={0.75}
            >
                <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
                    <MaterialCommunityIcons name={t.icon} size={22} color={t.color} />
                    {!item.is_read && <View style={styles.dot} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.nTitle, !item.is_read && { color: COLORS.primary }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={styles.nMsg} numberOfLines={2}>{item.message}</Text>
                    <Text style={styles.nTime}>{new Date(item.created_at).toLocaleString("vi-VN")}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Thông báo</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity style={styles.readAllBtn} onPress={markAllRead}>
                        <Text style={styles.readAllText}>✔ Đọc tất cả</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tabItem, tab === "all" && styles.tabActive]}
                    onPress={() => setTab("all")}
                >
                    <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>Tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, tab === "unread" && styles.tabActive]}
                    onPress={() => setTab("unread")}
                >
                    <Text style={[styles.tabText, tab === "unread" && styles.tabTextActive]}>
                        Chưa đọc{unreadCount > 0 ? `  ${unreadCount}` : ""}
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : displayed.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <Text style={{ fontSize: 52, marginBottom: 12 }}>🔔</Text>
                    <Text style={Styles.text}>
                        {tab === "unread" ? "Không có thông báo chưa đọc" : "Chưa có thông báo nào"}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={displayed}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingVertical: 8 }}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
    readAllBtn: {
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    readAllText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    tabs: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
        borderBottomWidth: 2.5,
        borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: COLORS.primary },
    tabText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
    tabTextActive: { color: COLORS.primary },
    item: {
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    itemUnread: { backgroundColor: "#f0f7ff" },
    sep: { height: 1, backgroundColor: COLORS.border },
    iconWrap: {
        width: 46, height: 46,
        borderRadius: 14,
        alignItems: "center", justifyContent: "center",
        flexShrink: 0,
    },
    dot: {
        position: "absolute", top: -2, right: -2,
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: COLORS.redLight,
        borderWidth: 2, borderColor: "#fff",
    },
    nTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text },
    nMsg: { fontSize: 11, color: COLORS.textMuted, marginTop: 3, lineHeight: 16 },
    nTime: { fontSize: 10, color: COLORS.textLight, marginTop: 5 },
    arrow: { color: COLORS.textLight, fontSize: 18, alignSelf: "center" },
});

export default Notifications;
