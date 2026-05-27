import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../styles/Styles";

const DoctorCard = ({ doctor, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            backgroundColor: "#fff", borderRadius: 16, padding: 14,
            flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10,
            elevation: 2, shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6,
        }}
    >
        <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: COLORS.primaryPale, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {doctor.avatar
                ? <Image source={{ uri: doctor.avatar }} style={{ width: 54, height: 54 }} />
                : <MaterialCommunityIcons name="doctor" size={28} color={COLORS.primary} />
            }
        </View>
        <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}>
                {doctor.full_name || doctor.name}
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                {doctor.specialty_name || doctor.specialty}
            </Text>
            {!!(doctor.experience_years) && (
                <View style={{ backgroundColor: COLORS.primaryPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: "flex-start" }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: COLORS.primary }}>
                        {doctor.experience_years} năm kinh nghiệm
                    </Text>
                </View>
            )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
);

export default DoctorCard;
