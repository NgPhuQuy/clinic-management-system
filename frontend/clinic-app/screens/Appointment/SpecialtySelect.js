import {
    View, FlatList, TouchableOpacity,
    ActivityIndicator, TextInput,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import { COLORS } from "../../styles/Styles";
import { specialtySelectStyles as styles } from "./Styles";

const SpecialtySelect = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [specialties, setSpecialties] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApis(user.token).get(endpoints["specialties"])
            .then(r => {
                const data = r.data.results || r.data;
                setSpecialties(data);
                setFiltered(data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(q ? specialties.filter(s => s.name.toLowerCase().includes(q)) : specialties);
    }, [search, specialties]);

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => nav.navigate("date-select", {
                specialtyId: item.id,
                specialtyName: item.name,
            })}
        >
            <View style={{ flex: 1 }}>
                <View style={styles.cardTop}>
                    <Text style={styles.specName}>{item.name}</Text>
                    {item.fee != null && (
                        <Text style={styles.specFee}>
                            {Number(item.fee).toLocaleString("vi-VN")}đ
                        </Text>
                    )}
                </View>
                {item.note ? <Text style={styles.specNote}>{item.note}</Text> : null}
                {item.description ? (
                    <Text style={styles.specDesc} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}
            </View>
            <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={COLORS.textLight}
                style={{ marginLeft: 8 }}
            />
        </TouchableOpacity>
    );

    const Separator = () => (
        <View style={{ height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 }} />
    );

    return (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <View style={styles.searchWrap}>
                <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm nhanh chuyên khoa"
                    placeholderTextColor={COLORS.textLight}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                        <MaterialCommunityIcons name="close" size={18} color={COLORS.textLight} />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : filtered.length === 0 ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name="stethoscope" size={48} color={COLORS.textLight} />
                    <Text style={{ marginTop: 12, color: COLORS.textMuted }}>Không tìm thấy chuyên khoa</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    ItemSeparatorComponent={Separator}
                    contentContainerStyle={{ paddingVertical: 8 }}
                />
            )}
        </View>
    );
};


export default SpecialtySelect;
