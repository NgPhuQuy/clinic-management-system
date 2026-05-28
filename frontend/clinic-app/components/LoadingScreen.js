import { View, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "../styles/Styles";

const LoadingScreen = ({ color = COLORS.primary, style }) => (
    <View style={[S.wrap, style]}>
        <ActivityIndicator size="large" color={color} />
    </View>
);

const S = StyleSheet.create({
    wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
});

export default LoadingScreen;
