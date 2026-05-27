import { StyleSheet, Platform } from "react-native";
import { COLORS } from "../../../styles/Styles";

export default StyleSheet.create({
    hiddenWebView: {
        width: 0,
        height: 0,
        position: "absolute",
        opacity: 0,
    },

    statusBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 6,
    },
    statusText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    rtmDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#fff",
        marginLeft: 4,
        opacity: 0.8,
    },

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

    chatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    rtmStatus: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
    },
    rtmStatusDot:  { width: 6, height: 6, borderRadius: 3 },
    rtmStatusText: { fontSize: 10, fontWeight: "700" },

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
