import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Text, Button } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles from "../../styles/Styles";

const Notifications = () => {
    const user = useContext(MyUserContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["notifications"]);
            setNotifications(res.data.results || res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const markRead = async (id) => {
        try {
            await authApis(user.token).patch(endpoints["notification-read"](id), {});
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) { console.error(e); }
    };

    const markAllRead = async () => {
        try {
            await authApis(user.token).post(endpoints["notification-read-all"], {});
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        } catch (e) { console.error(e); }
    };

    const TYPE_ICONS = {
        appointment_reminder: "📅",
        prescription: "💊",
        payment: "💳",
        general: "🔔",
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color="#1565c0" /></View>;

    return (
        <View style={Styles.container}>
            {unreadCount > 0 && (
                <View style={styles.topBar}>
                    <Text style={Styles.textSmall}>{unreadCount} thông báo chưa đọc</Text>
                    <Button compact textColor="#1565c0" onPress={markAllRead}>Đánh dấu tất cả đã đọc</Button>
                </View>
            )}

            {notifications.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <Text style={{ fontSize: 48 }}>🔔</Text>
                    <Text style={[Styles.text, { marginTop: 8 }]}>Chưa có thông báo nào</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[Styles.card, !item.is_read && styles.unread]}
                            onPress={() => markRead(item.id)}
                        >
                            <View style={Styles.row}>
                                <Text style={{ fontSize: 24, marginRight: 12 }}>
                                    {TYPE_ICONS[item.notification_type] || "🔔"}
                                </Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[Styles.subtitle, !item.is_read && { color: "#1565c0" }]}>
                                        {item.title}
                                    </Text>
                                    <Text style={Styles.text} numberOfLines={2}>{item.message}</Text>
                                    <Text style={Styles.textSmall}>{new Date(item.created_at).toLocaleString("vi-VN")}</Text>
                                </View>
                                {!item.is_read && <View style={styles.dot} />}
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    topBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 8,
        paddingHorizontal: 16,
        backgroundColor: "#e3f2fd",
    },
    unread: {
        borderLeftWidth: 3,
        borderLeftColor: "#1565c0",
        backgroundColor: "#f0f7ff",
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#1565c0",
        marginLeft: 8,
    },
});

export default Notifications;
