import { StyleSheet, Platform } from "react-native";
import { COLORS } from "../../styles/Styles";

export const paymentScreenStyles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    onlineNote: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#e3f2fd",
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 8,
        padding: 10,
        gap: 6,
    },
    onlineNoteText: { fontSize: 12, color: "#1565c0", flex: 1 },
    sectionLabel: {
        fontSize: 11, fontWeight: "700", color: COLORS.textLight,
        letterSpacing: 0.8, marginLeft: 20, marginTop: 16, marginBottom: 8,
    },
    infoRow: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", paddingVertical: 5,
    },
    infoLabel: { fontSize: 12, color: COLORS.textMuted },
    infoValue: { fontSize: 13, color: COLORS.text, fontWeight: "500", flex: 1, textAlign: "right" },
    divider:   { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
    amountText:{ fontSize: 20, fontWeight: "800", color: COLORS.primary },
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
});

export const paymentResultStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    iconCircle: {
        width: 110, height: 110, borderRadius: 55,
        alignItems: "center", justifyContent: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 22, fontWeight: "800",
        marginBottom: 8, textAlign: "center",
    },
    message: {
        fontSize: 13, color: COLORS.textMuted,
        textAlign: "center", marginBottom: 24, lineHeight: 20,
    },
    infoBox: {
        backgroundColor: "#fff", borderRadius: 12,
        padding: 14, width: "100%", marginBottom: 28,
        borderWidth: 1, borderColor: COLORS.border, gap: 4,
    },
    infoLine: { fontSize: 12, color: COLORS.textMuted, textAlign: "center" },
    btn: {
        width: "100%", borderRadius: 14, paddingVertical: 14,
        alignItems: "center", marginBottom: 10, elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8,
    },
    btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    btnOutline: {
        width: "100%", borderRadius: 14, paddingVertical: 13,
        alignItems: "center", borderWidth: 1.5, borderColor: COLORS.primary,
    },
    btnOutlineText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
});

export const paymentWebViewStyles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: Platform.OS === "ios" ? 52 : 36,
        paddingBottom: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    closeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
    closeText: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },
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

