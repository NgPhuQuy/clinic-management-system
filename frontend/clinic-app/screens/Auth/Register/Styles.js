import { StyleSheet } from "react-native";
import { COLORS } from "../../../styles/Styles";

export default StyleSheet.create({
    form: {
        backgroundColor: "#fff",
        margin: 16,
        borderRadius: 16,
        elevation: 3,
        padding: 20,
    },
    avatarPicker: {
        borderWidth: 1,
        borderColor: COLORS.primary,
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
