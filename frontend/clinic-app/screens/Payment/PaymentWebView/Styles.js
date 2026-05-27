import { StyleSheet, Platform } from "react-native";
import { COLORS } from "../../../styles/Styles";

export default StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 14,
        paddingBottom: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    closeBtn:    { paddingVertical: 4, paddingHorizontal: 8 },
    closeText:   { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },
    headerTitle: { color: "#fff", fontSize: 15, fontWeight: "800", flex: 1 },
    loadingOverlay: {
        position: "absolute",
        top: Platform.OS === "ios" ? 110 : 90,
        left: 0, right: 0, bottom: 0,
        zIndex: 10,
        backgroundColor: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
    },
    loadingText: { color: COLORS.textMuted, fontSize: 13 },
});
