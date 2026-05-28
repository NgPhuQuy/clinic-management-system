import {
    View, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";
import { notifStyles as S } from "./Styles";

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
    const nav  = useNavigation();
    const user = useContext(MyUserContext);
    const { top } = useSafeAreaInsets();
    const [notifications, setNotifications] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [tab,           setTab]           = useState("all");

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            if (!user?.token) return;
            const res = await authApis(user.token).get(endpoints["notifications"]);
            const data = res.data.results || res.data;
            setNotifications(data);
        } catch (e) {
            console.warn("Notifications load error:", e?.response?.status);
        } finally {
            setLoading(false);
        }
    };

    const markRead = async (id) => {
        try {
            await authApis(user.token).patch(endpoints["notification-read"](id), {});
        } catch (_) {}
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const markAllRead = async () => {
        try { await authApis(user.token).patch(endpoints["notification-read-all"], {}); }
        catch (_) {}
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const openDetail = (item) => {
        if (!item.is_read) markRead(item.id);
        nav.navigate("notification-detail", { notification: item });
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;
    const displayed   = tab === "unread"
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const renderItem = ({ item }) => {
        const t = TYPE_MAP[item.type] || TYPE_MAP.system;
        return (
            <TouchableOpacity
                style={[S.item, !item.is_read && S.itemUnread]}
                onPress={() => openDetail(item)}
                activeOpacity={0.75}
            >
                <View style={[S.iconWrap, { backgroundColor: t.bg }]}>
                    <MaterialCommunityIcons name={t.icon} size={22} color={t.color} />
                    {!item.is_read && <View style={S.dot} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[S.nTitle, !item.is_read && { color: COLORS.primary }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={S.nMsg} numberOfLines={2}>{item.message}</Text>
                    <Text style={S.nTime}>
                        {item.created_at
                            ? new Date(item.created_at).toLocaleString("vi-VN")
                            : ""}
                    </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

            <View style={[S.header, { paddingTop: top + 16 }]}>
                <View style={S.headerLeft}>
                    <MaterialCommunityIcons name="bell" size={22} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={S.headerTitle}>Thông báo</Text>
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity style={S.readAllBtn} onPress={markAllRead}>
                        <MaterialCommunityIcons name="check-all" size={14} color="#fff" />
                        <Text style={S.readAllText}> Đọc tất cả</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={S.tabs}>
                {["all", "unread"].map(key => (
                    <TouchableOpacity
                        key={key}
                        style={[S.tabItem, tab === key && S.tabActive]}
                        onPress={() => setTab(key)}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={[S.tabText, tab === key && S.tabTextActive]}>
                                {key === "all" ? "Tất cả" : "Chưa đọc"}
                            </Text>
                            {key === "unread" && unreadCount > 0 && (
                                <View style={S.unreadBadge}>
                                    <Text style={S.unreadBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : displayed.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <View style={S.emptyIcon}>
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
                    ItemSeparatorComponent={() => <View style={S.sep} />}
                    onRefresh={load}
                    refreshing={loading}
                />
            )}
        </View>
    );
};

export default Notifications;
