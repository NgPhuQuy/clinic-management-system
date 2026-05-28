import { StyleSheet } from "react-native";
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
});

