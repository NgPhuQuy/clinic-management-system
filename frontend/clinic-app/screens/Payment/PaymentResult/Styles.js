import { StyleSheet } from "react-native";
import { COLORS } from "../../../styles/Styles";

export default StyleSheet.create({
    container: {
        flex: 1, backgroundColor: COLORS.bg,
        alignItems: "center", justifyContent: "center", padding: 32,
    },
    iconCircle: {
        width: 110, height: 110, borderRadius: 55,
        alignItems: "center", justifyContent: "center", marginBottom: 24,
    },
    title:   { fontSize: 22, fontWeight: "800", marginBottom: 8, textAlign: "center" },
    message: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", marginBottom: 24, lineHeight: 20 },
    infoBox: {
        backgroundColor: "#fff", borderRadius: 12, padding: 14,
        width: "100%", marginBottom: 28, borderWidth: 1, borderColor: COLORS.border, gap: 4,
    },
    infoLine: { fontSize: 12, color: COLORS.textMuted, textAlign: "center" },
    btn: {
        width: "100%", borderRadius: 14, paddingVertical: 14,
        alignItems: "center", marginBottom: 10, elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8,
    },
    btnText:        { color: "#fff", fontWeight: "800", fontSize: 15 },
    btnOutline:     { width: "100%", borderRadius: 14, paddingVertical: 13, alignItems: "center", borderWidth: 1.5, borderColor: COLORS.primary },
    btnOutlineText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
});
