import { View, ActivityIndicator } from "react-native";
import { COLORS } from "../styles/Styles";

const LoadingScreen = ({ color = COLORS.primary, style }) => (
    <View style={[{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg }, style]}>
        <ActivityIndicator size="large" color={color} />
    </View>
);

export default LoadingScreen;
