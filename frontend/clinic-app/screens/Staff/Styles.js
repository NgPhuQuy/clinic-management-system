import { StyleSheet } from "react-native";
import { COLORS } from "../../styles/Styles";

export const staffDashboardStyles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.teal,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    greeting: { fontSize: 20, fontWeight: "800", color: "#fff" },
    dateText:  { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
});

export const staffTestResultsStyles = StyleSheet.create({
    tabRow: {
        flexDirection: "row", backgroundColor: "#fff",
        paddingHorizontal: 16, paddingVertical: 10, gap: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        elevation: 2,
    },
    tabBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 8, borderRadius: 10,
        borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#fff",
    },
    tabBtnActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
    tabBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4,
    },
    cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    testName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    typeLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: "700" },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    infoText: { fontSize: 12, color: COLORS.textMuted },
    resultBox: {
        backgroundColor: COLORS.greenPale, borderRadius: 8, padding: 10,
        marginTop: 8, borderWidth: 1, borderColor: COLORS.green,
    },
    resultLabel: { fontSize: 11, color: COLORS.green, fontWeight: "700", marginBottom: 2 },
    resultValue: { fontSize: 14, fontWeight: "600", color: COLORS.text },
    refText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    fillBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        marginTop: 10, paddingVertical: 9, borderRadius: 10,
        backgroundColor: COLORS.primary,
    },
    fillBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
    typeTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.primaryPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeTagText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
    fillOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    fillSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    fillHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    fillTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    fillSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
    fillPatient: { fontSize: 12, color: COLORS.primary, fontWeight: "600", marginTop: 4 },
    input: { backgroundColor: "#fff", marginBottom: 10 },
});
