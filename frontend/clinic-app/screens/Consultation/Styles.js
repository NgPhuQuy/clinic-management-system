import { StyleSheet, Platform } from "react-native";
import { COLORS } from "../../styles/Styles";

export const consultationRoomStyles = StyleSheet.create({
    statusBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 6,
    },
    statusText: { color: "#fff", fontWeight: "700", fontSize: 14 },

    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    waitingBox: {
        alignItems: "center",
        paddingVertical: 16,
        gap: 8,
    },
    waitingText:    { fontSize: 15, fontWeight: "600", color: COLORS.text, marginTop: 4 },
    waitingSubText: { fontSize: 12, color: COLORS.textMuted },

    endedBox:  { alignItems: "center", paddingVertical: 12, gap: 6 },
    endedText: { fontSize: 15, fontWeight: "600", color: COLORS.green },

    bubble: {
        maxWidth: "78%",
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 8,
    },
    bubbleMe: {
        backgroundColor: COLORS.primary,
        alignSelf: "flex-end",
        borderBottomRightRadius: 4,
    },
    bubbleThem: {
        backgroundColor: "#f0f4ff",
        alignSelf: "flex-start",
        borderBottomLeftRadius: 4,
    },
    bubbleSender: { fontSize: 11, fontWeight: "700", color: COLORS.primary, marginBottom: 2 },
    bubbleText:   { fontSize: 14, color: COLORS.text },
    bubbleTime:   { fontSize: 10, color: COLORS.textMuted, marginTop: 3, textAlign: "right" },

    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        padding: 10,
        paddingBottom: Platform.OS === "ios" ? 24 : 10,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: "#f5f7fa",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 14,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
    },
});

export const videoCallScreenStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#111827" },
    webview: { flex: 1 },
});
