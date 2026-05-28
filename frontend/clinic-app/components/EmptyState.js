import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../styles/Styles";

const EmptyState = ({ icon = "inbox-outline", message = "Không có dữ liệu", sub, style }) => (
    <View style={[S.wrap, style]}>
        <View style={S.iconWrap}>
            <MaterialCommunityIcons name={icon} size={40} color={COLORS.primary} />
        </View>
        <Text style={S.message}>{message}</Text>
        {!!sub && <Text style={S.sub}>{sub}</Text>}
    </View>
);

const S = StyleSheet.create({
    wrap:     { alignItems: "center", marginTop: 60, paddingHorizontal: 32 },
    iconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primaryPale, alignItems: "center", justifyContent: "center" },
    message:  { color: COLORS.textMuted, marginTop: 12, fontSize: 14, textAlign: "center" },
    sub:      { color: COLORS.textLight, fontSize: 12, marginTop: 4, textAlign: "center" },
});

export default EmptyState;
