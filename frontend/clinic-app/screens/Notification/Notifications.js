/**
 * screens/Notification/Notifications.js
 * Danh sách thông báo – bấm vào → NotificationDetail
 */
import {
    View, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, notifStyles as S } from "../../styles/Styles";

const TYPE_MAP = {
    appointment_reminder: { icon: "calendar-clock",     bg: "#e8f5e9", color: COLORS.green   },
    payment_success:      { icon: "credit-card-outline", bg: "#f3e5f5", color: COLORS.purple  },
    payment:              { icon: "credit-card-outline", bg: "#f3e5f5", color: COLORS.purple  },
    prescription_ready:   { icon: "pill",                bg: "#fff3e0", color: COLORS.orange  },
    prescription:         { icon: "pill",                bg: "#fff3e0", color: COLORS.orange  },
    lab_result:           { icon: "flask-outline",       bg: "#e0f7fa", color: COLORS.teal    },
    system:               { icon: "information-outline", bg: "#e3f2fd", color: COLORS.primary },
    general:              { icon: "bell-outline",        bg: "#e3f2fd", color: COLORS.primary },
};

const MOCK_NOTIFICATIONS = [
    { id:1, title:"Nhắc lịch khám",        message:"Bạn có lịch hẹn với BS. Nguyễn Văn An vào 09:00 ngày mai. Vui lòng đến đúng giờ.",                   notification_type:"appointment_reminder", related_object_id:1, related_object_type:"appointment", is_read:false, created_at: new Date(Date.now()-1*3600*1000).toISOString() },
    { id:2, title:"Thanh toán thành công", message:"Hóa đơn #000012 đã thanh toán 450.000đ qua MoMo thành công.",                                        notification_type:"payment_success",      related_object_id:12, related_object_type:"payment",     is_read:false, created_at: new Date(Date.now()-3*3600*1000).toISOString() },
    { id:3, title:"Đơn thuốc đã sẵn sàng",message:"Đơn thuốc #8 đã được cấp phát. Vui lòng đến nhận tại quầy dược.",                                    notification_type:"prescription_ready",   related_object_id:8,  related_object_type:"prescription", is_read:true,  created_at: new Date(Date.now()-5*3600*1000).toISOString() },
    { id:4, title:"Cập nhật hệ thống",     message:"Hệ thống sẽ bảo trì lúc 02:00 ngày mai, dự kiến 30 phút. Vui lòng hoàn tất các tác vụ trước giờ đó.",notification_type:"system",              is_read:true,  created_at: new Date(Date.now()-24*3600*1000).toISOString() },
    { id:5, title:"Nhắc lịch khám",        message:"Bạn có lịch hẹn với BS. Trần Thị Bích vào 14:00 ngày 28/05/2026. Vui lòng mang theo CMND.",          notification_type:"appointment_reminder", related_object_id:5, related_object_type:"appointment", is_read:false, created_at: new Date(Date.now()-48*3600*1000).toISOString() },
    { id:6, title:"Tài khoản xác thực",    message:"Tài khoản của bạn đã được xác thực thành công. Chào mừng đến với hệ thống!",                          notification_type:"system",              is_read:true,  created_at: new Date(Date.now()-72*3600*1000).toISOString() },
];

const Notifications = () => {
    const nav  = useNavigation();
    const user = useContext(MyUserContext);

    const [notifications, setNotifications] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [tab,           setTab]           = useState("all");

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            if (!user?.token) { setNotifications(MOCK_NOTIFICATIONS); return; }
            const res = await authApis(user.token).get(endpoints["notifications"]);
            const data = res.data.results || res.data;
            setNotifications(data.length > 0 ? data : MOCK_NOTIFICATIONS);
        } catch (e) {
            console.warn("Notifications mock:", e?.response?.status);
            setNotifications(MOCK_NOTIFICATIONS);
        } finally {
            setLoading(false);
        }
    };

    const markRead = async (id) => {
        try {
            await authApis(user.token).patch(endpoints["notification-read"](id), {});
        } catch (_) { /* ignore */ }
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const markAllRead = async () => {
        try { await authApis(user.token).patch(endpoints["notification-read-all"], {}); }
        catch (_) { /* ignore */ }
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const openDetail = (item) => {
        // Đánh dấu đã đọc trước khi mở
        if (!item.is_read) markRead(item.id);
        nav.navigate("notification-detail", { notification: item });
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;
    const displayed   = tab === "unread"
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const renderItem = ({ item }) => {
        const t = TYPE_MAP[item.notification_type] || TYPE_MAP.general;
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

            {/* Header */}
            <View style={S.header}>
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

            {/* Tabs */}
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
