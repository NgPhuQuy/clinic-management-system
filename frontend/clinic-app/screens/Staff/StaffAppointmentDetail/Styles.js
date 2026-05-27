import { StyleSheet } from "react-native";
import { COLORS } from "../../../styles/Styles";

export default StyleSheet.create({
    container:         { flex: 1, backgroundColor: COLORS.bg },
    statusBanner:      { padding: 20, alignItems: "center" },
    statusBannerLabel: { fontSize: 18, fontWeight: "800", color: "#fff" },
    statusBannerDate:  { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },
    card: {
        margin: 12, marginBottom: 0, backgroundColor: "#fff",
        borderRadius: 14, padding: 16,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    },
    cardTitle:    { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
    infoRow:      { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
    infoLabel:    { fontSize: 13, color: COLORS.textMuted, marginLeft: 6, minWidth: 90 },
    infoValue:    { fontSize: 13, color: COLORS.text, flex: 1, fontWeight: "500" },
    services:     { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
    serviceTitle: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
    serviceRow:   { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    serviceName:  { fontSize: 13, color: COLORS.text },
    servicePrice: { fontSize: 13, fontWeight: "600", color: COLORS.primary },
    actions:      { margin: 12, gap: 10 },
    btn:          { borderRadius: 10, paddingVertical: 4 },
});
