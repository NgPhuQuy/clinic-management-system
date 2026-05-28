import {
    View, FlatList, TouchableOpacity, Image,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS } from "../../styles/Styles";
import { slotSelectStyles as styles } from "./Styles";

const DoctorAvatar = ({ uri, size = 52 }) => {
    const [error, setError] = useState(false);
    if (uri && !error) {
        return (
            <Image
                source={{ uri }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
                onError={() => setError(true)}
            />
        );
    }
    return (
        <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: COLORS.primaryPale,
            alignItems: "center", justifyContent: "center",
        }}>
            <MaterialCommunityIcons name="doctor" size={size * 0.52} color={COLORS.primary} />
        </View>
    );
};

const SlotSelect = () => {
    const nav = useNavigation();
    const route = useRoute();
    const { date, schedules, specialtyName } = route.params;

    const dateObj = new Date(date + "T00:00:00");
    const dateDisplay = dateObj.toLocaleDateString("vi-VN", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => nav.navigate("book-appointment", {
                doctorId: item.doctorId,
                doctorName: item.doctorName,
                scheduleId: item.id,
                schedule: item,
            })}
        >
            <DoctorAvatar uri={item.doctorAvatar} size={52} />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docName}>BS. {item.doctorName}</Text>
                <View style={styles.timeRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.timeText}> {item.start_time} – {item.end_time}</Text>
                </View>
                {item.max_appointments != null && (
                    <Text style={styles.slotInfo}>Tối đa {item.max_appointments} ca / ngày</Text>
                )}
            </View>
            <View style={styles.selectBtn}>
                <Text style={styles.selectBtnText}>Chọn</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: "#f0f4fa" }}>
            <View style={styles.dateHeader}>
                <MaterialCommunityIcons name="calendar-check" size={18} color={COLORS.primary} />
                <View style={{ marginLeft: 8 }}>
                    {specialtyName && (
                        <Text style={styles.specialtyLabel}>{specialtyName}</Text>
                    )}
                    <Text style={styles.dateText}>{dateDisplay}</Text>
                </View>
            </View>

            {schedules.length === 0 ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
                    <MaterialCommunityIcons name="calendar-remove-outline" size={56} color={COLORS.textLight} />
                    <Text style={styles.emptyText}>
                        Không có ca khám nào trong ngày này
                    </Text>
                    <Text style={styles.emptySubText}>Vui lòng chọn ngày khác</Text>
                </View>
            ) : (
                <FlatList
                    data={schedules}
                    keyExtractor={item => `${item.id}-${item.doctorId}`}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                />
            )}
        </View>
    );
};


export default SlotSelect;
