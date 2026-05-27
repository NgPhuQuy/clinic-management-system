import { View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../styles/Styles";

const EmptyState = ({ icon = "inbox-outline", message = "Không có dữ liệu", sub, style }) => (
    <View style={[{ alignItems: "center", marginTop: 60, paddingHorizontal: 32 }, style]}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primaryPale, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name={icon} size={40} color={COLORS.primary} />
        </View>
        <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 14, textAlign: "center" }}>{message}</Text>
        {!!sub && <Text style={{ color: COLORS.textLight, fontSize: 12, marginTop: 4, textAlign: "center" }}>{sub}</Text>}
    </View>
);

export default EmptyState;
