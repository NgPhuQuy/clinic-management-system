import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, doctorCardStyles as S } from "../styles/Styles";

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
