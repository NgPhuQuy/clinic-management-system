import { StyleSheet } from "react-native";
import { COLORS } from "../../styles/Styles";

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
