import { StyleSheet } from "react-native";
import { COLORS } from "../../styles/Styles";

export const editProfileStyles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    label: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 6 },
    input: {
        backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14,
    },
    chip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#fff",
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
});

export const paymentsStyles = StyleSheet.create({
    summaryBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    summaryItem: { flex: 1, alignItems: "center" },
    summaryNum: { fontSize: 17, fontWeight: "800", color: "#fff" },
    summaryLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
    summaryDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.25)" },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: "#e0e0e0",
    },
    filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterChipText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
    filterChipTextActive: { color: "#fff" },
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        elevation: 2,
        borderLeftWidth: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    methodIcon: {
        width: 46, height: 46,
        borderRadius: 13,
        alignItems: "center", justifyContent: "center",
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    amount: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    metaRow: { flexDirection: "row", alignItems: "center" },
    meta: { fontSize: 11, color: COLORS.textMuted },
    metaDot: { fontSize: 11, color: COLORS.textLight },
    note: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },
    payBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 12,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        paddingVertical: 9,
    },
    payBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

export const medicalRecordsStyles = StyleSheet.create({
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primaryPale, alignItems: "center", justifyContent: "center" },
    date: { fontSize: 12, color: COLORS.textMuted },
    diagnosis: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginTop: 2 },
    doctor: { fontSize: 12, color: COLORS.primary, marginTop: 1 },
    testBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.primaryPale, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
    testBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.primary },

    detailHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 2 },
    detailTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    detailDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

    infoCard: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2 },
    infoRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12 },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
    infoLabel: { width: 130, fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
    infoValue: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: "500" },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

    testItem: { paddingHorizontal: 16, paddingBottom: 12 },
    testItemBorder: { borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 12, marginTop: 0 },
    testName: { fontSize: 14, fontWeight: "700", color: COLORS.text, flex: 1 },
    testMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    testResult: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginTop: 4 },
    testRef: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    testPending: { fontSize: 12, color: COLORS.orange, fontStyle: "italic" },
    statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
    statusChipText: { fontSize: 11, fontWeight: "700" },
    resultBox: { backgroundColor: COLORS.bg, borderRadius: 8, padding: 10, marginTop: 6 },

    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#e0e0e0", backgroundColor: "#fff" },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
    chipTextActive: { color: "#fff" },
});

export const testResultsStyles = StyleSheet.create({
    filterRow: {
        flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border,
        flexWrap: "wrap",
    },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5, borderColor: "#e0e0e0", backgroundColor: "#fff",
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    chipTextActive: { color: "#fff" },
    chipBadge: {
        minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
    },
    chipBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
    chipBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.primary },

    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    typeTag: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: COLORS.primaryPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    typeText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1,
    },
    statusDone: { backgroundColor: COLORS.green + "18", borderColor: COLORS.green + "44" },
    statusPending: { backgroundColor: COLORS.orange + "18", borderColor: COLORS.orange + "44" },
    statusText: { fontSize: 11, fontWeight: "700" },

    testName: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 12, color: COLORS.textMuted },

    resultBox: {
        backgroundColor: COLORS.bg, borderRadius: 10, padding: 10,
        borderLeftWidth: 3, borderLeftColor: COLORS.green,
    },
    resultLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, marginBottom: 2 },
    resultValue: { fontSize: 16, fontWeight: "700", color: COLORS.text },
    refText: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },

    pendingBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: COLORS.orange + "12", borderRadius: 8, padding: 10,
    },
    pendingText: { fontSize: 12, color: COLORS.orange, fontStyle: "italic", flex: 1 },
});
