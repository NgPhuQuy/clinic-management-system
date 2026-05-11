import { View, ScrollView, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { Text, TextInput, Chip } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles from "../../styles/Styles";

const DoctorList = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { specialtyId, specialtyName } = route.params || {};

    const [doctors, setDoctors] = useState([]);
    const [specialties, setSpecialties] = useState([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState(specialtyId || null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSpecialties();
    }, []);

    useEffect(() => {
        loadDoctors();
    }, [selectedSpecialty, search]);

    const loadSpecialties = async () => {
        try {
            const res = await authApis(user?.token).get(endpoints["specialties"]);
            setSpecialties(res.data.results || res.data);
        } catch (e) { console.error(e); }
    };

    const loadDoctors = async () => {
        try {
            setLoading(true);
            let url = endpoints["doctors"] + "?";
            if (selectedSpecialty) url += `specialty=${selectedSpecialty}&`;
            if (search) url += `search=${search}&`;
            const res = await authApis(user?.token).get(url);
            setDoctors(res.data.results || res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderDoctor = ({ item }) => (
        <TouchableOpacity
            style={Styles.card}
            onPress={() => nav.navigate("doctor-detail", { doctorId: item.id })}
        >
            <View style={Styles.row}>
                <View style={styles.doctorAvatar}>
                    <Text style={{ fontSize: 28 }}>👨‍⚕️</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={Styles.subtitle}>BS. {item.full_name}</Text>
                    <Text style={Styles.text}>{item.specialty_name || "Đa khoa"}</Text>
                    <Text style={Styles.textSmall}>{item.experience_years} năm kinh nghiệm</Text>
                    <View style={Styles.row}>
                        <Text style={[Styles.textSmall, { color: "#1565c0", fontWeight: "600" }]}>
                            Phí khám: {Number(item.consultation_fee || 0).toLocaleString("vi-VN")}đ
                        </Text>
                        {item.is_available && (
                            <View style={[Styles.badge, { backgroundColor: "#4caf50", marginLeft: 8 }]}>
                                <Text style={Styles.badgeText}>Đang nhận bệnh</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Text style={{ fontSize: 20, color: "#1565c0" }}>›</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={Styles.container}>
            <View style={styles.searchBar}>
                <TextInput
                    placeholder="Tìm bác sĩ..."
                    value={search}
                    onChangeText={setSearch}
                    mode="outlined"
                    left={<TextInput.Icon icon="magnify" />}
                    outlineColor="#90caf9"
                    activeOutlineColor="#1565c0"
                    style={{ backgroundColor: "#fff" }}
                />
            </View>

            {/* Specialty filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ paddingHorizontal: 16 }}>
                <Chip
                    selected={!selectedSpecialty}
                    onPress={() => setSelectedSpecialty(null)}
                    style={[styles.chip, !selectedSpecialty && styles.chipSelected]}
                    textStyle={!selectedSpecialty ? { color: "#fff" } : {}}
                >
                    Tất cả
                </Chip>
                {specialties.map((s) => (
                    <Chip
                        key={s.id}
                        selected={selectedSpecialty === s.id}
                        onPress={() => setSelectedSpecialty(s.id)}
                        style={[styles.chip, selectedSpecialty === s.id && styles.chipSelected]}
                        textStyle={selectedSpecialty === s.id ? { color: "#fff" } : {}}
                    >
                        {s.name}
                    </Chip>
                ))}
            </ScrollView>

            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color="#1565c0" />
                    <Text style={[Styles.text, { marginTop: 12 }]}>Đang tải danh sách bác sĩ...</Text>
                </View>
            ) : doctors.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <Text style={{ fontSize: 48 }}>🏥</Text>
                    <Text style={Styles.text}>Không tìm thấy bác sĩ</Text>
                </View>
            ) : (
                <FlatList
                    data={doctors}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderDoctor}
                    contentContainerStyle={{ padding: 16 }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    searchBar: {
        padding: 16,
        backgroundColor: "#fff",
        elevation: 2,
    },
    chips: {
        paddingVertical: 10,
        backgroundColor: "#f5f6fa",
    },
    chip: {
        marginRight: 8,
        backgroundColor: "#e3f2fd",
    },
    chipSelected: {
        backgroundColor: "#1565c0",
    },
    doctorAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#e3f2fd",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
});

export default DoctorList;
