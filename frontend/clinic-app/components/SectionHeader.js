import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "../styles/Styles";

const SectionHeader = ({ title, onSeeAll, seeAllLabel = "Xem tất cả" }) => (
    <View style={S.row}>
        <Text style={S.title}>{title}</Text>
        {!!onSeeAll && (
            <TouchableOpacity onPress={onSeeAll}>
                <Text style={S.seeAll}>{seeAllLabel}</Text>
            </TouchableOpacity>
        )}
    </View>
);

const S = StyleSheet.create({
    row:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    title:  { fontSize: 16, fontWeight: "700", color: COLORS.text },
    seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
});

export default SectionHeader;
