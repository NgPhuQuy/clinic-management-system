import { StyleSheet } from "react-native";
import { COLORS } from "../../../styles/Styles";

export default StyleSheet.create({
    sectionLabel: {
        fontSize: 11, fontWeight: "700", color: COLORS.textLight,
        letterSpacing: 0.8, marginLeft: 20, marginTop: 16, marginBottom: 8,
    },
    infoRow: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", paddingVertical: 5,
    },
    infoLabel:  { fontSize: 12, color: COLORS.textMuted },
    infoValue:  { fontSize: 13, color: COLORS.text, fontWeight: "500", flex: 1, textAlign: "right" },
    divider:    { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
    amountText: { fontSize: 20, fontWeight: "800", color: COLORS.primary },
    methodCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 10,
        borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: COLORS.border, elevation: 1,
    },
    methodCardSelected: {
        borderColor: COLORS.primary, backgroundColor: COLORS.primaryPale, elevation: 3,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 6,
    },
    methodIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    methodLabel:   { fontSize: 14, fontWeight: "700", color: COLORS.text },
    methodSub:     { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    radio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
    radioSelected: { borderColor: COLORS.primary },
    radioDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
    onlineNote: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#e3f2fd", marginHorizontal: 16, marginBottom: 10,
        borderRadius: 8, padding: 10, gap: 6,
    },
    onlineNoteText: { fontSize: 12, color: COLORS.primary, flex: 1 },
});
