import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { COLORS, STATUS_CONFIG } from "../styles/Styles";

const StatusBadge = ({ status, style }) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status, color: COLORS.textMuted };
    return (
        <View style={[S.badge, { backgroundColor: cfg.color + "22" }, style]}>
            <Text style={[S.label, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
    );
};

const S = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    label: { fontSize: 11, fontWeight: "700" },
});

export default StatusBadge;
