import { StyleSheet } from "react-native";
import { COLORS } from "../../../styles/Styles";

export default StyleSheet.create({
    header: {
        backgroundColor: COLORS.primary,
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
