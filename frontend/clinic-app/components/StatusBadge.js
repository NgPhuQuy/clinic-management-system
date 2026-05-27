import { View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS, STATUS_CONFIG } from "../styles/Styles";

const StatusBadge = ({ status, style }) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status, color: COLORS.textMuted };
    return (
        <View style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: cfg.color + "22" }, style]}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: cfg.color }}>{cfg.label}</Text>
        </View>
    );
};

export default StatusBadge;
