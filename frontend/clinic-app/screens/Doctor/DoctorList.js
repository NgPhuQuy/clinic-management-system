import {
    View, ScrollView, TouchableOpacity, StyleSheet,
    FlatList, ActivityIndicator, Image,
} from "react-native";
import { Text, TextInput, Chip } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, doctorListStyles as S } from "../../styles/Styles";

// Avatar bác sĩ: ưu tiên ảnh API, fallback về icon
const DoctorAvatar = ({ uri, size = 56 }) => {
    const [error, setError] = useState(false);
    if (uri && !error) {
        return (
            <Image
                source={{ uri }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
                onError={() => setError(true)}
            />
        );
    }
    return (
        <View style={[S.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
            <MaterialCommunityIcons name="doctor" size={size * 0.52} color={COLORS.primary} />
        </View>
    );
};

const DoctorList = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { specialtyId } = route.params || {};

    const [doctors, setDoctors] = useState([]);
    const [specialties, setSpecialties] = useState([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState(specialtyId ?? null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadSpecialties(); }, []);

    useEffect(() => {
        const timer = setTimeout(() => { loadDoctors(); }, 300);
        return () => clearTimeout(timer);
    }, [selectedSpecialty, search]);

    const loadSpecialties = async () => {
        try {
            const res = await authApis(user?.token).get(endpoints["specialties"]);
            setSpecialties(res.data.results || res.data);
        } catch (e) { console.error("Specialties:", e); }
    };

    const loadDoctors = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedSpecialty != null) params.append("specialty", selectedSpecialty);
            if (search.trim()) params.append("search", search.trim());
            const url = `${endpoints["doctors"]}?${params.toString()}`;
            const res = await authApis(user?.token).get(url);
            setDoctors(res.data.results || res.data);
        } catch (e) {
            console.error("Doctors:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSpecialty = (id) => {
        setSelectedSpecialty(prev => (prev === id ? null : id));
    };

    const renderDoctor = ({ item }) => (
        <TouchableOpacity
            style={Styles.card}
            activeOpacity={0.8}
            onPress={() => nav.navigate("doctor-detail", { doctorId: item.id })}
        >
            <View style={Styles.row}>
                <DoctorAvatar uri={item.avatar || item.avatar_url} size={56} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={Styles.subtitle} numberOfLines={1}>
                        BS. {item.full_name}
                    </Text>
                    <Text style={[Styles.text, { marginTop: 1 }]}>
                        {item.specialty_name || "Đa khoa"}
                    </Text>
                    <Text style={Styles.textSmall}>
                        {item.experience_years} năm kinh nghiệm
                    </Text>
                    <View style={[Styles.row, { marginTop: 4, gap: 8 }]}>
                        <Text style={[Styles.textSmall, { color: COLORS.primary, fontWeight: "700" }]}>
                            {Number(item.consultation_fee || 0).toLocaleString("vi-VN")}đ
                        </Text>
                        {item.is_available && (
                            <View style={[Styles.badge, { backgroundColor: COLORS.greenLight, paddingVertical: 2 }]}>
                                <Text style={[Styles.badgeText, { fontSize: 10 }]}>Đang nhận bệnh</Text>
                            </View>
                        )}
                    </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.primary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={Styles.container}>
            {/* Search bar */}
            <View style={S.searchBar}>
                <TextInput
                    placeholder="Tìm bác sĩ..."
                    value={search}
                    onChangeText={setSearch}
                    mode="outlined"
                    left={<TextInput.Icon icon="magnify" />}
                    right={search ? <TextInput.Icon icon="close" onPress={() => setSearch("")} /> : null}
                    outlineColor="#90caf9"
                    activeOutlineColor={COLORS.primary}
                    style={{ backgroundColor: "#fff" }}
                />
            </View>

            <View style={S.chipsContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={S.chipsContent}
                >
                    <Chip
                        selected={selectedSpecialty === null}
                        onPress={() => setSelectedSpecialty(null)}
                        style={[S.chip, selectedSpecialty === null && S.chipSelected]}
                        textStyle={[S.chipText, selectedSpecialty === null && S.chipTextSelected]}
                        icon={selectedSpecialty === null ? "check" : undefined}
                    >
                        Tất cả
                    </Chip>
                    {specialties.map((s) => {
                        const isSelected = selectedSpecialty === s.id;
                        return (
                            <Chip
                                key={s.id}
                                selected={isSelected}
                                onPress={() => handleSelectSpecialty(s.id)}
                                style={[S.chip, isSelected && S.chipSelected]}
                                textStyle={[S.chipText, isSelected && S.chipTextSelected]}
                                icon={isSelected ? "check" : undefined}
                            >
                                {s.name}
                            </Chip>
                        );
                    })}
                </ScrollView>
            </View>

            {/* List */}
            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={[Styles.text, { marginTop: 12 }]}>Đang tải danh sách bác sĩ...</Text>
                </View>
            ) : doctors.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <MaterialCommunityIcons name="doctor" size={64} color={COLORS.textLight} />
                    <Text style={[Styles.text, { marginTop: 12, fontWeight: "600" }]}>
                        Không tìm thấy bác sĩ
                    </Text>
                    <Text style={[Styles.textSmall, { marginTop: 4 }]}>Thử thay đổi bộ lọc hoặc từ khoá</Text>
                </View>
            ) : (
                <FlatList
                    data={doctors}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderDoctor}
                    contentContainerStyle={{ padding: 16 }}
                    onRefresh={loadDoctors}
                    refreshing={loading}
                />
            )}
        </View>
    );
};
export default DoctorList;