import { View, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { Text } from "react-native-paper";
import { useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import { notifStyles as S, COLORS } from "../../styles/Styles";

const TYPE_MAP = {
    appointment_reminder: {
        icon:   "calendar-clock",
        bg:     "#e8f5e9",
        color:  COLORS.green,
        headerBg: COLORS.green,
        label:  "Nhắc lịch hẹn",
        action: "Xem lịch hẹn",
        screen: "my-appointments",
    },
    payment_success: {
        icon:   "credit-card-check-outline",
        bg:     "#f3e5f5",
        color:  COLORS.purple,
        headerBg: COLORS.purple,
        label:  "Thanh toán thành công",
        action: "Xem lịch sử thanh toán",
        screen: "payments",
    },
    prescription_ready: {
        icon:   "pill",
        bg:     "#fff3e0",
        color:  COLORS.orange,
        headerBg: COLORS.orange,
        label:  "Đơn thuốc sẵn sàng",
        action: "Xem đơn thuốc",
        screen: "prescriptions",
    },
    lab_result: {
        icon:   "flask-outline",
        bg:     "#e0f7fa",
        color:  COLORS.teal,
        headerBg: COLORS.teal,
        label:  "Kết quả xét nghiệm",
        action: "Xem hồ sơ bệnh án",
        screen: "medical-records",
    },
    system: {
        icon:   "information-outline",
        bg:     "#e3f2fd",
        color:  COLORS.primary,
        headerBg: COLORS.primaryDark,
        label:  "Thông báo hệ thống",
        action: null,
        screen: null,
    },
    general: {
        icon:   "bell-outline",
        bg:     "#e3f2fd",
        color:  COLORS.primary,
        headerBg: COLORS.primaryDark,
        label:  "Thông báo",
        action: null,
        screen: null,
    },
};

const normaliseType = (t) => {
    if (!t) return "general";
    const map = {
        appointment_reminder: "appointment_reminder",
        payment_success:      "payment_success",
        payment:              "payment_success",
        prescription_ready:   "prescription_ready",
        prescription:         "prescription_ready",
        lab_result:           "lab_result",
        system:               "system",
    };
    return map[t] || "general";
};

const NotificationDetail = () => {
    const nav    = useNavigation();
    const route  = useRoute();
    const user   = useContext(MyUserContext);

    const { notification } = route.params || {};

    if (!notification) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text>Không tìm thấy thông báo.</Text>
            </View>
        );
    }

    const typeKey = normaliseType(notification.notification_type || notification.type);
    const cfg     = TYPE_MAP[typeKey] || TYPE_MAP.general;

    const createdAt = notification.created_at
        ? new Date(notification.created_at).toLocaleString("vi-VN", {
              weekday: "long", day: "2-digit", month: "2-digit",
              year: "numeric", hour: "2-digit", minute: "2-digit",
          })
        : "";

    const handleAction = () => {
        if (!cfg.screen) return;
        if (cfg.screen === "my-appointments" && notification.related_object_id) {
            nav.navigate("appointment-detail", { id: notification.related_object_id });
        } else {
            nav.navigate(cfg.screen);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar backgroundColor={cfg.headerBg} barStyle="light-content" />

            <View style={[S.detailHeader, { backgroundColor: cfg.headerBg }]}>
                <View style={[S.detailIconWrap, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                    <MaterialCommunityIcons name={cfg.icon} size={36} color="#fff" />
                </View>
                <Text style={S.detailTitle}>{notification.title}</Text>
                {createdAt ? <Text style={S.detailTime}>{createdAt}</Text> : null}

                <View style={{
                    marginTop: 10,
                    paddingHorizontal: 12, paddingVertical: 4,
                    borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)",
                }}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                        {notification.is_read ? "✓ Đã đọc" : "● Chưa đọc"}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
                    <View style={{
                        alignSelf: "flex-start",
                        flexDirection: "row", alignItems: "center", gap: 6,
                        backgroundColor: cfg.bg, borderRadius: 10,
                        paddingHorizontal: 10, paddingVertical: 5,
                    }}>
                        <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.color} />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: cfg.color }}>
                            {cfg.label}
                        </Text>
                    </View>
                </View>

                <View style={S.detailBody}>
                    <Text style={S.detailMsgTitle}>Nội dung thông báo</Text>
                    <Text style={S.detailMsgText}>{notification.message}</Text>
                </View>

                {notification.related_object_id && (
                    <View style={[S.detailBody, { marginTop: 0 }]}>
                        <Text style={S.detailMsgTitle}>Thông tin liên quan</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <MaterialCommunityIcons name="link-variant" size={16} color={COLORS.textMuted} />
                            <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                                {notification.related_object_type === "appointment" && "Lịch hẹn "}
                                {notification.related_object_type === "payment"     && "Thanh toán "}
                                {notification.related_object_type === "prescription"&& "Đơn thuốc "}
                                #{notification.related_object_id}
                            </Text>
                        </View>
                    </View>
                )}

                {cfg.action && (
                    <TouchableOpacity style={S.detailActionBtn} onPress={handleAction} activeOpacity={0.85}>
                        <Text style={S.detailActionText}>{cfg.action} →</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={{
                        margin: 16, marginTop: cfg.action ? 4 : 16,
                        borderWidth: 1.5, borderColor: COLORS.border,
                        borderRadius: 14, paddingVertical: 13, alignItems: "center",
                        backgroundColor: "#fff",
                    }}
                    onPress={() => nav.goBack()}
                >
                    <Text style={{ color: COLORS.textMuted, fontWeight: "700", fontSize: 14 }}>
                        ← Quay lại
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

export default NotificationDetail;
