import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../styles/Styles";

const DoctorCard = ({ doctor, onPress }) => (
    <TouchableOpacity onPress={onPress} style={S.card}>
        <View style={S.avatar}>
            {doctor.avatar
                ? <Image source={{ uri: doctor.avatar }} style={S.avatarImg} />
                : <MaterialCommunityIcons name="doctor" size={28} color={COLORS.primary} />
            }
        </View>
        <View style={{ flex: 1 }}>
            <Text style={S.name}>{doctor.full_name || doctor.name}</Text>
            <Text style={S.specialty}>{doctor.specialty_name || doctor.specialty}</Text>
            {!!(doctor.experience_years) && (
                <View style={S.expBadge}>
                    <Text style={S.expText}>{doctor.experience_years} năm kinh nghiệm</Text>
                </View>
            )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
);

export default DoctorCard;

const S = StyleSheet.create({
    card: {
        backgroundColor: "#fff", borderRadius: 16, padding: 14,
        flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10,
        elevation: 2, shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6,
    },
    avatar: {
        width: 54, height: 54, borderRadius: 16,
        backgroundColor: COLORS.primaryPale,
        alignItems: "center", justifyContent: "center", overflow: "hidden",
    },
    avatarImg: { width: 54, height: 54 },
    name:      { fontSize: 13, fontWeight: "700", color: COLORS.text },
    specialty: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    expBadge:  {
        backgroundColor: COLORS.primaryPale, borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 3,
        marginTop: 6, alignSelf: "flex-start",
    },
    expText:   { fontSize: 10, fontWeight: "600", color: COLORS.primary },
});
