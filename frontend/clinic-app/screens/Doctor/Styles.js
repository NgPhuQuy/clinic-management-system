import { StyleSheet, Platform } from "react-native";
import { COLORS } from "../../styles/Styles";

export const doctorDashboardStyles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    greeting: { fontSize: 20, fontWeight: "800", color: "#fff" },
    dateText:  { fontSize: 13, color: "#bbdefb", marginTop: 4 },
});

export const doctorConsultationsStyles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    cardLeft: { marginRight: 12 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    roomId: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    apptId: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    cardRight: { alignItems: "flex-end" },
    badge: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    badgeText: { fontSize: 11, fontWeight: "700" },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.5 },
});

export const doctorAppointmentDetailPdStyles = StyleSheet.create({
    statusRow:   { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 12, padding: 14, elevation: 2 },
    badge:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText:   { fontSize: 12, fontWeight: "700" },
    dateText:    { fontSize: 12, color: COLORS.textMuted, marginLeft: "auto" },
    notesBox:    { backgroundColor: "#fff", borderRadius: 12, padding: 14, elevation: 2 },
    notesLabel:  { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 4 },
    notesText:   { fontSize: 14, color: COLORS.text },
    sectionTitle:{ fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    medCard:     { backgroundColor: "#fff", borderRadius: 12, padding: 14, elevation: 2 },
    medCardTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    medName:     { fontSize: 15, fontWeight: "700", color: COLORS.text, flex: 1, marginRight: 8 },
    medAmount:   { fontSize: 14, fontWeight: "700", color: COLORS.primary },
    medMeta:     { gap: 4 },
    metaItem:    { fontSize: 13, color: COLORS.text },
    metaLabel:   { color: COLORS.textMuted },
    totalRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.primary, borderRadius: 12, padding: 16 },
    totalLabel:  { fontSize: 15, fontWeight: "700", color: "#fff" },
    totalValue:  { fontSize: 18, fontWeight: "800", color: "#fff" },
});

export const doctorAppointmentDetailTestStyles = StyleSheet.create({
    row: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingVertical: 7, borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    name: { fontSize: 13, fontWeight: "600", color: COLORS.text },
    result: { fontSize: 12, color: COLORS.primary, marginTop: 1 },
    pending: { fontSize: 12, color: COLORS.orange, fontStyle: "italic", marginTop: 1 },
    badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
    badgeText: { fontSize: 10, fontWeight: "700" },
});

export const doctorAppointmentDetailMdStyles = StyleSheet.create({
    searchInput: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: COLORS.text,
        backgroundColor: "#f8f9fa",
    },
});

export const doctorMedicalRecordsStyles = StyleSheet.create({
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4,
    },
    cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    dateText: { fontSize: 12, color: COLORS.textMuted },
    prescBadge: { backgroundColor: COLORS.greenPale, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    prescBadgeText: { fontSize: 11, color: COLORS.green, fontWeight: "700" },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
    diagnosisLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
    diagnosisText: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
    testCountBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: COLORS.primaryPale, borderRadius: 6,
        paddingHorizontal: 7, paddingVertical: 3,
        borderWidth: 1, borderColor: COLORS.primaryMid,
    },
    testCountText: { fontSize: 11, color: COLORS.primary, fontWeight: "600" },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    bigName: { fontSize: 20, fontWeight: "800", color: COLORS.text },
    subMuted: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
    infoBlock: { marginBottom: 10 },
    infoLabel: { fontSize: 12, color: COLORS.textMuted },
    infoValue: { fontSize: 14, color: COLORS.text, fontWeight: "500", marginTop: 2 },
    sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    addTestBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary },
    testItem: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, marginBottom: 8 },
    testHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    typeTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.primaryPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeTagText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    statusBadgeText: { fontSize: 11, fontWeight: "700" },
    testName: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginTop: 2 },
    testDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
    testResult: { fontSize: 13, color: COLORS.text, marginTop: 4 },
    testRef: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    fillBtn: {
        flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
        alignSelf: "flex-start",
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
        borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.primaryPale,
    },
    fillBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
    emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 10 },
    modalHeader: {
        backgroundColor: COLORS.primaryDark, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    modeRow: {
        flexDirection: "row", backgroundColor: "#fff",
        paddingHorizontal: 16, paddingVertical: 10, gap: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    modeBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    },
    modeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    modeBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
    input: { backgroundColor: "#fff", marginBottom: 10 },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
    typeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#fff" },
    typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    typeChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    hintBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: COLORS.primaryPale, borderRadius: 8,
        padding: 10, marginBottom: 12,
        borderWidth: 1, borderColor: COLORS.primaryMid,
    },
    hintText: { flex: 1, fontSize: 12, color: COLORS.primary, fontWeight: "500" },
    fillOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    fillSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    fillHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    fillTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    fillSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
});

export const doctorAppointmentDetailStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    statusHeader: { padding: 20, alignItems: "center" },
    statusHeaderText: { fontSize: 18, fontWeight: "800", color: "#fff" },
    statusHeaderDate: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },
    card: {
        margin: 16, marginBottom: 0, backgroundColor: "#fff",
        borderRadius: 14, padding: 16, elevation: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
    infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
    infoLabel: { fontSize: 13, color: COLORS.textMuted, marginLeft: 4, marginRight: 6, minWidth: 80 },
    infoValue: { fontSize: 13, color: COLORS.text, flex: 1, fontWeight: "500" },
    emptyCard: {
        margin: 16, marginBottom: 0, backgroundColor: "#fff",
        borderRadius: 14, padding: 24, alignItems: "center",
        elevation: 1,
    },
    emptyText: { color: COLORS.textMuted, marginTop: 8, fontSize: 14 },
    actions: { margin: 16, gap: 10 },
    btn: { borderRadius: 10, paddingVertical: 4 },
    modalHeader: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    input: { backgroundColor: "#fff", marginBottom: 10 },
    row: { flexDirection: "row", gap: 10 },
    subTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
    medList: {
        backgroundColor: COLORS.primaryPale, borderRadius: 10,
        padding: 12, marginBottom: 12,
    },
    medItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    medName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
    medDetail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    pickerBtn: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
        padding: 14, backgroundColor: "#fff", marginBottom: 10,
    },
    medDropdown: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
        backgroundColor: "#fff", marginBottom: 10, overflow: "hidden",
    },
    medOption: {
        padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    medOptionText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
    medOptionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});

export const doctorDetailStyles = StyleSheet.create({
    header: {
        backgroundColor: "#1565c0",
        padding: 24,
        alignItems: "center",
        paddingTop: 32,
    },
    avatarCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    name: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    specialty: {
        color: "#bbdefb",
        marginTop: 4,
    },
    statsRow: {
        flexDirection: "row",
        marginTop: 20,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 12,
        padding: 12,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statNum: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#fff",
    },
    statLabel: {
        fontSize: 11,
        color: "#bbdefb",
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: "rgba(255,255,255,0.3)",
    },
    scheduleItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
});

export const doctorListStyles = StyleSheet.create({
    searchBar: {
        padding: 12,
        paddingHorizontal: 16,
        backgroundColor: "#fff",
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    chipsContainer: {
        height: 52,
        backgroundColor: "#f5f6fa",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    chipsContent: {
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    chip: {
        backgroundColor: COLORS.primaryPale,
        borderRadius: 20,
        height: 34,
    },
    chipSelected: {
        backgroundColor: COLORS.primary,
    },
    chipText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: "600",
    },
    chipTextSelected: {
        color: "#fff",
    },
    avatarFallback: {
        backgroundColor: COLORS.primaryPale,
        alignItems: "center",
        justifyContent: "center",
    },
});

export const doctorSchedulesStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
    addBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    },
    addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    monthHeader: {
        fontSize: 14, fontWeight: "700", color: COLORS.textMuted,
        paddingVertical: 10, paddingHorizontal: 4,
    },
    card: {
        backgroundColor: "#fff", borderRadius: 12, padding: 12,
        flexDirection: "row", alignItems: "center", marginBottom: 10,
        elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07, shadowRadius: 4,
    },
    dateBox: {
        width: 56, alignItems: "center", paddingRight: 12,
        borderRightWidth: 1, borderRightColor: COLORS.border,
    },
    dayOfWeek: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
    dateNum: { fontSize: 24, fontWeight: "900", color: COLORS.text, lineHeight: 28 },
    dateMonth: { fontSize: 10, color: COLORS.textMuted },
    timeRange: { fontSize: 16, fontWeight: "700", color: COLORS.text },
    apptInfo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    availBadge: {
        alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6, marginTop: 6,
    },
    cardActions: { alignItems: "center", gap: 4 },
    iconBtn: { padding: 4 },
    modalHeader: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    input: { backgroundColor: "#fff", marginBottom: 12 },
    row: { flexDirection: "row", gap: 10 },
});
