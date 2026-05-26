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
    appointment_reminder:  { icon: "calendar-clock",     bg: "#e8f5e9", color: COLORS.green },
    appointment_confirmed: { icon: "calendar-check",     bg: "#e8f5e9", color: COLORS.green },
    appointment_cancelled: { icon: "calendar-remove",    bg: "#fce4ec", color: "#e53935" },
    prescription_ready:    { icon: "pill",               bg: "#fff3e0", color: COLORS.orange },
    payment_success:       { icon: "credit-card-check",  bg: "#f3e5f5", color: "#7b1fa2" },
    inventory_alert:       { icon: "package-variant",    bg: "#fff8e1", color: "#f57f17" },
    test_result_ready:     { icon: "flask-outline",      bg: "#e0f7fa", color: "#00838f" },
    system:                { icon: "bell-outline",       bg: "#e3f2fd", color: COLORS.primary },
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
        } catch (e) { console.error("Notifications error:", e); }
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
        const t = TYPE_MAP[item.type] || TYPE_MAP.system;
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
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialCommunityIcons name="bell" size={22} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.headerTitle}>Thông báo</Text>
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity style={styles.readAllBtn} onPress={markAllRead}>
                        <MaterialCommunityIcons name="check-all" size={14} color="#fff" />
                        <Text style={styles.readAllText}> Đọc tất cả</Text>
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
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.tabText, tab === "unread" && styles.tabTextActive]}>Chưa đọc</Text>
                        {unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : displayed.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <View style={styles.emptyIcon}>
                        <MaterialCommunityIcons name="bell-off-outline" size={48} color={COLORS.textLight} />
                    </View>
                    <Text style={[Styles.text, { marginTop: 12, fontWeight: "600" }]}>
                        {tab === "unread" ? "Không có thông báo chưa đọc" : "Chưa có thông báo nào"}
                    </Text>
                    <Text style={[Styles.textSmall, { marginTop: 6, textAlign: "center", paddingHorizontal: 40 }]}>
                        Các thông báo lịch hẹn, đơn thuốc và kết quả xét nghiệm sẽ hiển thị tại đây
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={displayed}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingVertical: 8 }}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                    onRefresh={load}
                    refreshing={loading}
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
    headerLeft: { flexDirection: "row", alignItems: "center" },
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
    readAllBtn: {
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        flexDirection: "row",
        alignItems: "center",
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
    unreadBadge: {
        backgroundColor: COLORS.redLight,
        borderRadius: 8,
        minWidth: 18,
        paddingHorizontal: 5,
        paddingVertical: 1,
        alignItems: "center",
    },
    unreadBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
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
    emptyIcon: {
        width: 88, height: 88,
        borderRadius: 24,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center",
    },
});

export default Notifications;