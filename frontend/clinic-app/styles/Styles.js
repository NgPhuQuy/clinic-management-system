import { StyleSheet, Platform } from "react-native";

export const COLORS = {
    primary: "#1565c0",
    primaryDark: "#0d47a1",
    primaryLight: "#1976d2",
    primaryPale: "#e3f2fd",
    primaryMid: "#bbdefb",
    green: "#2e7d32",
    greenLight: "#4caf50",
    greenPale: "#e8f5e9",
    orange: "#e65100",
    orangeLight: "#ff9800",
    orangePale: "#fff3e0",
    red: "#c62828",
    redLight: "#f44336",
    redPale: "#fce4ec",
    purple: "#6a1b9a",
    purpleLight: "#ab47bc",
    purplePale: "#f3e5f5",
    teal: "#00695c",
    tealLight: "#26a69a",
    tealPale: "#e0f7fa",
    bg: "#f0f4fa",
    white: "#ffffff",
    text: "#1a2340",
    textMuted: "#5a6a85",
    textLight: "#8fa0ba",
    border: "#dde6f5",
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

export default StyleSheet.create({
    // Layout
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    padding: {
        padding: 16,
    },
    margin: {
        marginBottom: 12,
    },
    center: {
        alignItems: "center",
        justifyContent: "center",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },

    // Card
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

    // Typography
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.primaryDark,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.text,
    },
    text: {
        fontSize: 13,
        color: COLORS.textMuted,
        lineHeight: 20,
    },
    textSmall: {
        fontSize: 11,
        color: COLORS.textLight,
    },
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

    // Badge
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: "flex-start",
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#fff",
    },

    // Avatar
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarCircle: {
        width: 54,
        height: 54,
        borderRadius: 16,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center",
        justifyContent: "center",
    },

    // Button
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
    btnPrimaryText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 15,
    },
    btnOutline: {
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: "center",
        marginBottom: 10,
    },
    btnOutlineText: {
        color: COLORS.primary,
        fontWeight: "700",
        fontSize: 15,
    },
});