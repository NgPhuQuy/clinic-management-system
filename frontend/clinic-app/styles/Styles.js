import { StyleSheet, Platform } from "react-native";

const SCREEN_W = 375;

// ─────────────────────────────── COLOR PALETTE ───────────────────────────────
export const COLORS = {
    primary:      "#1565c0",
    primaryDark:  "#0d47a1",
    primaryLight: "#1976d2",
    primaryPale:  "#e3f2fd",
    primaryMid:   "#bbdefb",
    green:        "#2e7d32",
    greenLight:   "#4caf50",
    greenPale:    "#e8f5e9",
    orange:       "#e65100",
    orangeLight:  "#ff9800",
    orangePale:   "#fff3e0",
    red:          "#c62828",
    redLight:     "#f44336",
    redPale:      "#fce4ec",
    purple:       "#6a1b9a",
    purpleLight:  "#ab47bc",
    purplePale:   "#f3e5f5",
    teal:         "#00695c",
    tealLight:    "#26a69a",
    tealPale:     "#e0f7fa",
    bg:           "#f0f4fa",
    white:        "#ffffff",
    text:         "#1a2340",
    textMuted:    "#5a6a85",
    textLight:    "#8fa0ba",
    border:       "#dde6f5",
};

export const ICON_BG = {
    blue:   { bg: "#e3f2fd", color: "#1565c0" },
    green:  { bg: "#e8f5e9", color: "#2e7d32" },
    orange: { bg: "#fff3e0", color: "#e65100" },
    purple: { bg: "#f3e5f5", color: "#6a1b9a" },
    teal:   { bg: "#e0f7fa", color: "#00695c" },
    pink:   { bg: "#fce4ec", color: "#c2185b" },
    indigo: { bg: "#e8eaf6", color: "#283593" },
    amber:  { bg: "#fff8e1", color: "#f57f17" },
};

// ─────────────────────────── APPOINTMENT STATUS ───────────────────────────────
export const STATUS_CONFIG = {
    all:         { label: "Tất cả",       color: COLORS.textMuted },
    pending:     { label: "Chờ xác nhận", color: COLORS.orange },
    confirmed:   { label: "Đã xác nhận",  color: COLORS.green },
    in_progress: { label: "Đang khám",    color: COLORS.purple },
    completed:   { label: "Hoàn thành",   color: COLORS.primary },
    cancelled:   { label: "Đã hủy",       color: COLORS.red },
    no_show:     { label: "Không đến",    color: COLORS.textLight },
};

// ─────────────────────────── SHARED STYLES ────────────────────────────────────
const Styles = StyleSheet.create({
    // ── Layout ──
    container:  { flex: 1, backgroundColor: COLORS.bg },
    padding:    { padding: 16 },
    margin:     { marginBottom: 12 },
    center:     { alignItems: "center", justifyContent: "center" },
    row:        { flexDirection: "row", alignItems: "center" },
    flex1:      { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32 },

    // ── Card ──
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: "#1565c0",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    cardPressable: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: "#1565c0",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        borderWidth: 1.5,
        borderColor: "transparent",
    },

    // ── Typography ──
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.primaryDark,
        marginBottom: 8,
    },
    subtitle:   { fontSize: 15, fontWeight: "700", color: COLORS.text },
    text:       { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
    textSmall:  { fontSize: 11, color: COLORS.textLight },
    sectionHeader: {
        fontSize: 15,
        fontWeight: "800",
        color: COLORS.primary,
        marginTop: 4,
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 10,
    },

    // ── Badge ──
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: "flex-start",
    },
    badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

    // ── Avatar ──
    avatar:      { width: 80,  height: 80,  borderRadius: 40 },
    avatarLarge: { width: 100, height: 100, borderRadius: 50 },
    avatarCircle: {
        width: 54,
        height: 54,
        borderRadius: 16,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center",
        justifyContent: "center",
    },

    // ── Button ──
    btnPrimary: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 10,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    btnOutline: {
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: "center",
        marginBottom: 10,
    },
    btnOutlineText: { color: COLORS.primary, fontWeight: "700", fontSize: 15 },

    // ── Header (shared across dashboards) ──
    header: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === "ios" ? 56 : 48,
        paddingBottom: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle:    { fontSize: 20, fontWeight: "800", color: "#fff" },
    headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
    notifBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
    },

    // ── Section ──
    section:       { margin: 16, marginBottom: 0 },
    sectionRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sectionTitle:  { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
    seeAll:        { fontSize: 13, color: COLORS.primary, fontWeight: "600" },

    // ── Stat card (Doctor & Staff dashboard) ──
    statCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        marginBottom: 2,
    },
    statIcon:  { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    statValue: { fontSize: 22, fontWeight: "800", color: COLORS.text },
    statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },

    // ── Quick action grid ──
    actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    actionBtn: {
        width: "31%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    actionIcon:  { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    actionLabel: { fontSize: 11, fontWeight: "600", color: COLORS.text, textAlign: "center" },

    // ── Appointment list item (mini) ──
    apptItem: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        elevation: 1,
        gap: 10,
    },
    timeBox:     { padding: 8, borderRadius: 8, alignItems: "center", minWidth: 56 },
    timeText:    { fontSize: 13, fontWeight: "700", color: COLORS.primary },
    apptPatient: { fontSize: 14, fontWeight: "700", color: COLORS.text },
    apptSub:     { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

    // ── Status badge ──
    statusBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText:   { fontSize: 10, fontWeight: "700" },

    // ── Filter chip ──
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: "#fff",
    },
    filterChipActive: { borderColor: "transparent" },
    filterChipText:       { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    filterChipTextActive: { color: "#fff" },

    // ── Revenue card (Staff) ──
    revenueRow:   { flexDirection: "row", margin: 16, marginBottom: 0, gap: 10 },
    revenueCard:  { flex: 1, borderRadius: 14, padding: 14 },
    revenueLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 6 },
    revenueValue: { fontSize: 15, fontWeight: "800", color: "#fff", marginTop: 2 },

    // ── Profile (StaffDoctorProfile) ──
    profileHeader: {
        paddingTop: Platform.OS === "ios" ? 56 : 48,
        paddingBottom: 28,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    profileAvatarWrap: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: "rgba(255,255,255,0.25)",
        alignItems: "center", justifyContent: "center",
        marginBottom: 12,
        borderWidth: 3, borderColor: "rgba(255,255,255,0.5)",
        overflow: "hidden",
    },
    profileAvatar:   { width: 90, height: 90, borderRadius: 45 },
    profileName:     { fontSize: 20, fontWeight: "800", color: "#fff", textAlign: "center" },
    profileRoleTag:  {
        flexDirection: "row", alignItems: "center", gap: 4,
        marginTop: 6, paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)",
    },
    profileRoleText: { fontSize: 12, fontWeight: "700", color: "#fff" },
    profileInfoRow: {
        flexDirection: "row", justifyContent: "center", gap: 16,
        marginTop: 12,
    },
    profileInfoItem: { alignItems: "center" },
    profileInfoVal:  { fontSize: 16, fontWeight: "800", color: "#fff" },
    profileInfoLbl:  { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },

    menuCard:    { backgroundColor: "#fff", borderRadius: 16, marginHorizontal: 16, marginBottom: 12, overflow: "hidden" },
    menuItem:    { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    menuItemLast:{ borderBottomWidth: 0 },
    menuIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
    menuLabel:   { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.text },

    // ── Search bar ──
    searchWrap:  { backgroundColor: "#fff", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
    searchInput: { backgroundColor: COLORS.bg, elevation: 0, height: 44 },

    // ── Appointment card (list) ──
    appointmentCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    apptCardTop:  { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
    apptDot:      { width: 10, height: 10, borderRadius: 5 },
    apptName:     { fontSize: 15, fontWeight: "700", color: COLORS.text },
    apptDoctor:   { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    apptInfoRow:  { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
    apptInfoText: { fontSize: 12, color: COLORS.textMuted },
    apptReason:   { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
    apptActions:  { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
    apptActionBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 8, borderWidth: 1.5, backgroundColor: "#fff",
    },
    apptActionLabel: { fontSize: 11, fontWeight: "700" },

    // ── Schedule / Calendar picker ──
    calendarWrap: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: "#1565c0",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    calendarMonthTxt: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    calendarDayName: {
        width: (SCREEN_W - 96) / 7,
        textAlign: "center",
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    calendarDay: {
        width: (SCREEN_W - 96) / 7,
        height: (SCREEN_W - 96) / 7,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.bg,
    },
    calendarDayText:     { fontSize: 13, fontWeight: "600", color: COLORS.text },
    calendarDaySelected: { backgroundColor: COLORS.primary },
    calendarDaySelectedText: { color: "#fff", fontWeight: "700" },
    calendarDayToday:    { borderWidth: 1.5, borderColor: COLORS.primary },
    calendarDayDisabled: { opacity: 0.3 },

    timeSlotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    timeSlot: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: "#fff",
    },
    timeSlotSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    timeSlotText:     { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
    timeSlotTextSelected: { color: "#fff" },
    timeSlotFull:     { opacity: 0.35 },

    // ── Book appointment form ──
    bookForm: {
        backgroundColor: "#fff",
        margin: 16,
        borderRadius: 16,
        elevation: 3,
        padding: 20,
    },
    bookBtn: { borderRadius: 8, paddingVertical: 4, marginBottom: 10 },

    // ── Date picker trigger ──
    datePickerBtn: {
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: 8,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 10,
        backgroundColor: COLORS.primaryPale,
    },
    datePickerBtnText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: "600" },

    // ── Doctor schedule list item ──
    scheduleItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        elevation: 1,
        gap: 10,
    },
    scheduleTimebox: {
        backgroundColor: COLORS.primaryPale,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: "center",
    },

    // ── Empty state ──
    emptyWrap:   { alignItems: "center", marginTop: 60, paddingHorizontal: 32 },
    emptyText:   { color: COLORS.textMuted, marginTop: 12, fontSize: 14, textAlign: "center" },
    emptySubtext:{ color: COLORS.textLight, fontSize: 12, marginTop: 4, textAlign: "center" },

    // ── Loading ──
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
});

export default Styles;

// ─────────────────────────────── NOTIFICATION ────────────────────────────────
export const notifStyles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: Platform.OS === "ios" ? 56 : 48,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerLeft:   { flexDirection: "row", alignItems: "center" },
    headerTitle:  { color: "#fff", fontSize: 20, fontWeight: "800" },
    readAllBtn: {
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        flexDirection: "row",
        alignItems: "center",
    },
    readAllText:  { color: "#fff", fontSize: 11, fontWeight: "700" },
    tabs: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
        borderBottomWidth: 2.5,
        borderBottomColor: "transparent",
    },
    tabActive:        { borderBottomColor: COLORS.primary },
    tabText:          { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
    tabTextActive:    { color: COLORS.primary },
    unreadBadge: {
        backgroundColor: "#f44336",
        borderRadius: 8,
        minWidth: 18,
        paddingHorizontal: 5,
        paddingVertical: 1,
        alignItems: "center",
    },
    unreadBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    item: {
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    itemUnread:  { backgroundColor: "#f0f7ff" },
    sep:         { height: 1, backgroundColor: COLORS.border },
    iconWrap: {
        width: 46, height: 46,
        borderRadius: 14,
        alignItems: "center", justifyContent: "center",
        flexShrink: 0,
    },
    dot: {
        position: "absolute", top: -2, right: -2,
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: "#f44336",
        borderWidth: 2, borderColor: "#fff",
    },
    nTitle:      { fontSize: 13, fontWeight: "700", color: COLORS.text },
    nMsg:        { fontSize: 11, color: COLORS.textMuted, marginTop: 3, lineHeight: 16 },
    nTime:       { fontSize: 10, color: COLORS.textLight, marginTop: 5 },
    emptyIcon: {
        width: 88, height: 88,
        borderRadius: 24,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center",
    },
    // NotificationDetail
    detailHeader: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: Platform.OS === "ios" ? 56 : 48,
        paddingBottom: 28,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    detailIconWrap: {
        width: 70, height: 70, borderRadius: 20,
        alignItems: "center", justifyContent: "center",
        marginBottom: 14,
    },
    detailTitle:   { fontSize: 20, fontWeight: "800", color: "#fff", textAlign: "center" },
    detailTime:    { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 8 },
    detailBody: {
        margin: 16,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        elevation: 2,
        shadowColor: "#1565c0",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    detailMsgTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted, marginBottom: 8 },
    detailMsgText:  { fontSize: 15, color: COLORS.text, lineHeight: 24 },
    detailActionBtn: {
        margin: 16,
        marginTop: 4,
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    detailActionText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

// ─────────────────────────────── PROFILE / PAYMENT ───────────────────────────
export const profileStyles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: Platform.OS === "ios" ? 56 : 52,
        paddingHorizontal: 20,
        paddingBottom: 36,
        alignItems: "center",
        gap: 6,
    },
    name:      { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 6 },
    roleBadge: {
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4,
    },
    roleText:  { color: "#fff", fontSize: 11, fontWeight: "600" },
    email:     { color: "rgba(255,255,255,0.7)", fontSize: 12 },
    statsRow: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: -22,
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        overflow: "hidden",
        zIndex: 10,
    },
    statItem:   { flex: 1, paddingVertical: 16, alignItems: "center" },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
    statNum:    { fontSize: 22, fontWeight: "800", color: COLORS.primary },
    statLabel:  { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
    section:    { marginHorizontal: 16, marginTop: 20 },
    sectionTitle: {
        fontSize: 11, fontWeight: "700", color: COLORS.textLight,
        letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
    },
    infoRow: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    infoLabel: { fontSize: 11, color: COLORS.textMuted, width: 90 },
    infoValue: { fontSize: 13, color: COLORS.text, fontWeight: "500", flex: 1 },
    menuRow: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        gap: 12,
    },
    menuIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    menuLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text },
    menuSub:   { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
    badgeWrap: {
        backgroundColor: "#f44336", borderRadius: 8,
        paddingHorizontal: 6, paddingVertical: 2, marginRight: 6,
    },
    badgeText:  { color: "#fff", fontSize: 10, fontWeight: "700" },
    logoutBtn: {
        margin: 16,
        backgroundColor: "#fff0f0",
        borderWidth: 1.5, borderColor: "#ffcdd2",
        borderRadius: 16, paddingVertical: 14,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    logoutText: { color: "#f44336", fontSize: 14, fontWeight: "700" },

    // Invoice list
    invoiceCard: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        marginBottom: 10, elevation: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07, shadowRadius: 4,
    },
    invoiceTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    invoiceNum: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    invoiceDoc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    invoiceAmt: { fontSize: 18, fontWeight: "800", color: COLORS.primary },
    invoiceDate:{ fontSize: 11, color: COLORS.textLight, marginTop: 4 },

    // Payment method card
    methodCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#fff", marginHorizontal: 0,
        marginBottom: 10, borderRadius: 14, padding: 14,
        borderWidth: 1.5, borderColor: COLORS.border, elevation: 1,
    },
    methodCardSelected: {
        borderColor: COLORS.primary, backgroundColor: COLORS.primaryPale,
        elevation: 3, shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6,
    },
    methodIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    methodLabel:   { fontSize: 14, fontWeight: "700", color: COLORS.text },
    methodSub:     { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    radio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
    radioSelected: { borderColor: COLORS.primary },
    radioDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
    paidTag: {
        backgroundColor: "#e8f5e9", borderRadius: 8,
        paddingVertical: 8, alignItems: "center", marginTop: 12,
    },
    paidTagText: { color: COLORS.green, fontWeight: "700", fontSize: 13 },
    payBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        backgroundColor: COLORS.primary, borderRadius: 12,
        paddingVertical: 13, marginTop: 14, gap: 8, elevation: 3,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3, shadowRadius: 6,
    },
    payBtnText:   { color: "#fff", fontWeight: "800", fontSize: 15 },
    statusBanner: { padding: 16, alignItems: "center" },
    statusText:   { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

// ─────────────────────────────── PAYMENT SCREEN ──────────────────────────────
export const paymentScreenStyles = StyleSheet.create({
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

// ─────────────────────────────── STAFF PAYMENTS ──────────────────────────────
export const staffPaymentStyles = StyleSheet.create({
    summaryBanner: {
        flexDirection: "row", backgroundColor: COLORS.orange,
        paddingVertical: 14, paddingHorizontal: 24,
        justifyContent: "space-around", alignItems: "center",
    },
    summaryItem:    { alignItems: "center" },
    summaryValue:   { fontSize: 20, fontWeight: "800", color: "#fff" },
    summaryLabel:   { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
    summaryDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.4)" },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardTop:     { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    methodText:  { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText:  { fontSize: 11, fontWeight: "700" },
    amountRow:   { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    amountLabel: { fontSize: 13, color: COLORS.textMuted, marginRight: 6 },
    amountValue: { fontSize: 16, fontWeight: "800", color: COLORS.primary },
    dateText:    { fontSize: 12, color: COLORS.textLight, marginBottom: 10 },
    collectBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: COLORS.orange, borderRadius: 10, paddingVertical: 10,
    },
    collectBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    emptyText: { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
    collectContainer: { flex: 1, backgroundColor: COLORS.bg },
    amountDisplay: {
        backgroundColor: COLORS.green, paddingTop: Platform.OS === "ios" ? 56 : 48,
        paddingBottom: 32, alignItems: "center",
    },
    collectLabel:   { fontSize: 14, color: "rgba(255,255,255,0.8)" },
    collectAmount:  { fontSize: 38, fontWeight: "900", color: "#fff", marginVertical: 6 },
    collectPatient: { fontSize: 16, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
    collectCard: { margin: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, elevation: 3 },
    collectCardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 16 },
    infoRow:   { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
    infoLabel: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
    infoValue: { fontSize: 13, fontWeight: "600", color: COLORS.text },
    noteLabel: { fontSize: 13, color: COLORS.textMuted, marginTop: 12, marginBottom: 6 },
    noteInput: {
        borderWidth: 1.5, borderColor: COLORS.border,
        borderRadius: 8, padding: 10,
        fontSize: 14, color: COLORS.text, marginBottom: 16,
    },
    steps:    { backgroundColor: COLORS.greenPale, borderRadius: 10, padding: 12, marginBottom: 20 },
    stepRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
    stepText: { fontSize: 13, color: COLORS.text, flex: 1 },
    confirmBtn: { borderRadius: 10, marginBottom: 4 },
});

// ── MedicalRecords ──

export const medicalRecordsStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    testResult: {},
});

// ── AppointmentDetail ──

export const appointmentDetailStyles = StyleSheet.create({
    statusBanner: {
        padding: 16,
        alignItems: "center",
    },
    statusText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    payBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 13,
        marginTop: 14,
        gap: 8,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    payBtnText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 15,
    },
    paidTag: {
        backgroundColor: "#e8f5e9",
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: "center",
        marginTop: 12,
    },
    paidTagText: {
        color: COLORS.green,
        fontWeight: "700",
        fontSize: 13,
    },
});

// ── MyAppointments ──

export const myAppointmentsStyles = StyleSheet.create({
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        padding: 12,
        backgroundColor: "#fff",
        elevation: 1,
    },
    chip: {
        backgroundColor: "#e3f2fd",
        marginBottom: 4,
    },
    chipSelected: {
        backgroundColor: "#1565c0",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
});

// ── Login ──

export const loginStyles = StyleSheet.create({
    header: {
        backgroundColor: "#1565c0",
        padding: 40,
        alignItems: "center",
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
    },
    appTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
    },
    appSub: {
        fontSize: 13,
        color: "#bbdefb",
        marginTop: 4,
    },
    form: {
        backgroundColor: "#fff",
        margin: 16,
        borderRadius: 16,
        elevation: 3,
        padding: 20,
    },
    btn: {
        borderRadius: 8,
        paddingVertical: 4,
        marginTop: 4,
    },
});

// ── Register ──

export const registerStyles = StyleSheet.create({
    form: {
        backgroundColor: "#fff",
        margin: 16,
        borderRadius: 16,
        elevation: 3,
        padding: 20,
    },
    avatarPicker: {
        borderWidth: 1,
        borderColor: "#1565c0",
        borderStyle: "dashed",
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
        marginBottom: 12,
    },
    btn: {
        borderRadius: 8,
        paddingVertical: 4,
        marginTop: 8,
        marginBottom: 8,
    },
});

// ── DoctorAppointmentDetail ──

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
    // Modal styles
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

// ── DoctorDetail ──

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

// ── DoctorList ──

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

// ── DoctorSchedules ──

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
    // Modal
    modalHeader: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    input: { backgroundColor: "#fff", marginBottom: 12 },
    row: { flexDirection: "row", gap: 10 },
});

// ── Home ──

export const homeStyles = StyleSheet.create({
    /* Header */
    header: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52,
        paddingHorizontal: 20,
        paddingBottom: 28,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoBox: {
        width: 38, height: 38,
        backgroundColor: "rgba(255,255,255,0.18)",
        borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    appName: { color: "#fff", fontSize: 16, fontWeight: "800" },
    appSub:  { color: "rgba(255,255,255,0.65)", fontSize: 10, marginTop: 1 },
    bellBtn: {
        width: 38, height: 38,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 19,
        alignItems: "center", justifyContent: "center",
    },
    greeting: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
    userName: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
    tagLine:  { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 },

    /* Search */
    searchWrap: { paddingHorizontal: 16, marginTop: -20, zIndex: 10 },
    searchBar: {
        backgroundColor: "#fff",
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
    searchBtn: {
        backgroundColor: COLORS.primaryPale,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    searchBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },

    /* Section */
    section: { paddingHorizontal: 16, paddingTop: 24 },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    sectionLink:  { fontSize: 12, fontWeight: "700", color: COLORS.primary },

    /* Quick grid */
    quickGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    quickItem: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 12,
        alignItems: "center",
        width: "22.5%",
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        gap: 8,
    },
    quickIconWrap: {
        width: 46, height: 46,
        borderRadius: 13,
        alignItems: "center", justifyContent: "center",
    },
    quickLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 14,
    },

    /* Appointment card */
    apptCard: {
        backgroundColor: COLORS.primaryDark,
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    apptAvatar: {
        width: 50, height: 50,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center", justifyContent: "center",
    },
    apptDoctor: { color: "#fff", fontSize: 14, fontWeight: "700" },
    apptTime:   { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4 },
    apptBadge: {
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    apptBadgeText: { fontSize: 10, fontWeight: "700" },

    /* Specialty chips */
    specChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        elevation: 1,
    },
    specText: { fontSize: 12, fontWeight: "600", color: COLORS.text },

    /* Doctor card */
    docCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
    },
    docAvatar: {
        width: 54, height: 54,
        borderRadius: 16,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center",
    },
    docName: { fontSize: 13, fontWeight: "700", color: COLORS.text },
    docSpec: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    docTag: {
        backgroundColor: COLORS.primaryPale,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 6,
        alignSelf: "flex-start",
    },
    docTagText: { fontSize: 10, fontWeight: "600", color: COLORS.primary },
    docBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    docBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    /* Health banner */
    healthBanner: {
        backgroundColor: "#e8f5e9",
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderWidth: 1.5,
        borderColor: "#a5d6a7",
    },
    healthTitle: { fontSize: 13, fontWeight: "700", color: COLORS.green },
    healthSub:   { fontSize: 11, color: "#388e3c", marginTop: 2 },
    healthBtn: {
        backgroundColor: COLORS.greenLight,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    healthBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    bannerWrap:   { paddingHorizontal: 16, paddingBottom: 8 },
    bannerEmoji:  { fontSize: 36 },

    docTagAvail:     { backgroundColor: "#e8f5e9", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, marginLeft: 6, alignSelf: "flex-start" },
    docTagAvailText: { fontSize: 10, fontWeight: "600", color: COLORS.greenLight },

    docEmptyCard: { alignItems: "center", paddingVertical: 24 },
    iconMb:       { marginBottom: 8 },
    spacerMd:     { height: 24 },
});

// ── PaymentResult ──

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

// ── PaymentWebView ──

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

// ── StaffAppointmentDetail ──

export const staffAppointmentDetailStyles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: COLORS.bg },
    statusBanner: { padding: 20, alignItems: "center" },
    statusBannerLabel: { fontSize: 18, fontWeight: "800", color: "#fff" },
    statusBannerDate:  { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },
    card: {
        margin: 12, marginBottom: 0, backgroundColor: "#fff",
        borderRadius: 14, padding: 16,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    },
    cardTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
    infoRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
    infoLabel: { fontSize: 13, color: COLORS.textMuted, marginLeft: 6, minWidth: 90 },
    infoValue: { fontSize: 13, color: COLORS.text, flex: 1, fontWeight: "500" },
    services:  { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
    serviceTitle: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
    serviceRow:   { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    serviceName:  { fontSize: 13, color: COLORS.text },
    servicePrice: { fontSize: 13, fontWeight: "600", color: COLORS.primary },
    actions: { margin: 12, gap: 10 },
    btn:     { borderRadius: 10, paddingVertical: 4 },
});

// ── StaffFindPatient ──

export const staffFindPatientStyles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: COLORS.bg },
    searchBox:   { backgroundColor: "#fff", padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    searchInput: { backgroundColor: COLORS.bg, elevation: 0 },
    hint:        { fontSize: 12, color: COLORS.textLight, marginTop: 4, marginLeft: 4 },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        flexDirection: "row", alignItems: "center", gap: 12,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    avatar: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center",
    },
    avatarText:  { fontSize: 20, fontWeight: "800", color: COLORS.primary },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
    infoRow:     { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    infoText:    { fontSize: 12, color: COLORS.textMuted },
    emptyText:   { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
    // Modal
    modalOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
    },
    modalBox: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, maxHeight: "85%",
    },
    modalHeader:     { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
    modalAvatar: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center",
    },
    modalAvatarText: { fontSize: 22, fontWeight: "800", color: COLORS.primary },
    modalName:       { fontSize: 17, fontWeight: "800", color: COLORS.text },
    modalEmail:      { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
    patientInfo: {
        backgroundColor: COLORS.bg, borderRadius: 10,
        padding: 12, marginBottom: 14,
    },
    patientInfoRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    patientInfoLabel: { fontSize: 12, color: COLORS.textMuted, minWidth: 80 },
    patientInfoValue: { fontSize: 13, color: COLORS.text, fontWeight: "500", flex: 1 },
    historyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
    apptRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    apptDot:    { width: 10, height: 10, borderRadius: 5 },
    apptDate:   { fontSize: 13, fontWeight: "600", color: COLORS.text },
    apptStatus: { fontSize: 11, fontWeight: "600", marginTop: 2 },
    emptyAppt:  { color: COLORS.textMuted, textAlign: "center", paddingVertical: 12 },
});

// ── StaffInventory ──

export const staffInventoryStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    tabBar: {
        backgroundColor: "#fff",
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        flexDirection: "row", alignItems: "center",
    },
    tab: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
        backgroundColor: "#fff",
    },
    tabActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText:    { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    importBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 12, paddingVertical: 8, marginRight: 10,
        borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.primary,
    },
    importBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 12,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardTop:       { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    medicineName:  { fontSize: 14, fontWeight: "700", color: COLORS.text },
    medicineCode:  { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    qtyBadge:      { alignItems: "center", padding: 8, borderRadius: 10, minWidth: 60 },
    qtyText:       { fontSize: 20, fontWeight: "800" },
    qtyLabel:      { fontSize: 10, color: COLORS.textMuted },
    infoRow:       { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
    infoText:      { fontSize: 12, color: COLORS.textMuted, flex: 1 },
    warningBadge:  { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, padding: 8, marginTop: 6 },
    warningText:   { fontSize: 12, fontWeight: "600", flex: 1 },
    alertTypeBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start", marginTop: 3 },
    alertTypeText: { fontSize: 11, fontWeight: "700" },
    resolveBtn:    { padding: 6, borderRadius: 8, backgroundColor: COLORS.greenPale },
    alertMsg:      { fontSize: 13, color: COLORS.text, marginTop: 4, marginBottom: 4 },
    dateText:      { fontSize: 12, color: COLORS.textLight },
    emptyText:     { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
    // Modal
    modalHeader: {
        backgroundColor: COLORS.primaryDark, paddingTop: 52,
        paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle:  { fontSize: 17, fontWeight: "700", color: "#fff" },
    fieldLabel:  { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 6 },
    picker: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8,
        padding: 13, backgroundColor: "#fff", marginBottom: 12,
    },
    dropdown: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
        backgroundColor: "#fff", marginBottom: 10, overflow: "hidden",
    },
    dropdownItem:  { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    dropdownText:  { fontSize: 14, fontWeight: "600", color: COLORS.text },
    dropdownSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    searchRow: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 10, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        gap: 6,
    },
    searchInput: {
        flex: 1, fontSize: 13, color: COLORS.text, paddingVertical: 0,
    },
    input:         { backgroundColor: "#fff", marginBottom: 10 },
    row:           { flexDirection: "row", gap: 10 },
});

// ── StaffPrescriptions ──

export const staffPrescriptionsStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    filterBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
    chip: {
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: COLORS.border, backgroundColor: "#fff",
    },
    chipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 14,
        elevation: 2, shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardTop:     { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    patientName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
    doctorName:  { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText:  { fontSize: 11, fontWeight: "700" },
    medList:     { backgroundColor: COLORS.bg, borderRadius: 8, padding: 10, marginBottom: 8 },
    medRow:      { flexDirection: "row", alignItems: "flex-start", gap: 4, marginBottom: 3 },
    medBullet:   { color: COLORS.primary, fontWeight: "700" },
    medText:     { fontSize: 13, color: COLORS.text, flex: 1 },
    moreText:    { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },
    cardBottom:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    dateText:    { fontSize: 12, color: COLORS.textMuted },
    totalText:   { fontSize: 13, fontWeight: "700", color: COLORS.primary },
    dispenseBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: COLORS.green,
        borderRadius: 10, paddingVertical: 10,
    },
    dispenseBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    emptyText: { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
    // Detail overlay
    detailOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    detailBox: {
        backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, maxHeight: "85%",
    },
    detailHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    detailTitle:   { fontSize: 17, fontWeight: "800", color: COLORS.text },
    detailPatient: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
    detailDoctor:  { fontSize: 13, color: COLORS.textMuted, marginBottom: 2 },
    detailNotes:   { fontSize: 13, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 8 },
    divider:       { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
    detailMed:     { padding: 10, backgroundColor: COLORS.bg, borderRadius: 10, marginBottom: 8 },
    detailMedName: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
    detailMedRow:  { flexDirection: "row", justifyContent: "space-between" },
    detailMedInfo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    detailMedInstr: { fontSize: 12, color: COLORS.primary, marginTop: 4, fontStyle: "italic" },
    detailTotal:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, marginBottom: 12 },
    detailTotalLabel: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
    detailTotalValue: { fontSize: 18, fontWeight: "800", color: COLORS.primary },
});
