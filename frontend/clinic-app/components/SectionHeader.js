import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from "../styles/Styles";

const SectionHeader = ({ title, onSeeAll, seeAllLabel = "Xem tất cả" }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>{title}</Text>
        {!!onSeeAll && (
            <TouchableOpacity onPress={onSeeAll}>
                <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: "600" }}>{seeAllLabel}</Text>
            </TouchableOpacity>
        )}
    </View>
);

export default SectionHeader;
