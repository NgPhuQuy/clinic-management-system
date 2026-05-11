import { StyleSheet } from "react-native";

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f6fa",
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
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1a237e",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    text: {
        fontSize: 14,
        color: "#555",
    },
    textSmall: {
        fontSize: 12,
        color: "#888",
    },
    primaryColor: "#1565c0",
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        alignSelf: "flex-start",
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#fff",
    },
    sectionHeader: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1565c0",
        marginTop: 8,
        marginBottom: 6,
    },
    divider: {
        height: 1,
        backgroundColor: "#e0e0e0",
        marginVertical: 8,
    },
});
