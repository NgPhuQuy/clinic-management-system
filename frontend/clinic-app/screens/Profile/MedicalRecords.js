import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { medicalRecordsStyles as S } from "../../styles/Styles";

export const MedicalRecords = () => {
    const nav = useNavigation();
    const user = useContext(MyUserContext);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await authApis(user.token).get(endpoints["medical-records"]);
                setRecords(res.data.results || res.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color="#1565c0" /></View>;

    return (
        <View style={Styles.container}>
            {records.length === 0 ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <Text style={{ fontSize: 48 }}>📂</Text>
                    <Text style={[Styles.text, { marginTop: 8 }]}>Chưa có hồ sơ bệnh án</Text>
                </View>
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={Styles.card}
                            onPress={() => nav.navigate("medical-record-detail", { id: item.id })}
                        >
                            <View style={S.row}>
                                <Text style={{ fontSize: 28, marginRight: 12 }}>📋</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={Styles.subtitle}>Khám ngày: {new Date(item.visit_date || item.created_at).toLocaleDateString("vi-VN")}</Text>
                                    <Text style={Styles.text} numberOfLines={1}>Chẩn đoán: {item.diagnosis || "—"}</Text>
                                    <Text style={Styles.textSmall}>BS. {item.doctor_name || item.doctor}</Text>
                                </View>
                                <Text style={{ fontSize: 20, color: "#1565c0" }}>›</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

export const MedicalRecordDetail = () => {
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { id } = route.params;
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await authApis(user.token).get(endpoints["medical-record-detail"](id));
                setRecord(res.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, [id]);

    if (loading) return <View style={[Styles.center, { flex: 1 }]}><ActivityIndicator size="large" color="#1565c0" /></View>;
    if (!record) return <View style={[Styles.center, { flex: 1 }]}><Text>Không tìm thấy hồ sơ</Text></View>;

    return (
        <ScrollView style={Styles.container}>
            <View style={Styles.padding}>
                <View style={Styles.card}>
                    <Text style={Styles.sectionHeader}>Thông tin khám</Text>
                    <Text style={Styles.text}>📅 Ngày khám: {new Date(record.visit_date || record.created_at).toLocaleDateString("vi-VN")}</Text>
                    <Text style={[Styles.text, { marginTop: 6 }]}>👨‍⚕️ Bác sĩ: {record.doctor_name || record.doctor}</Text>
                </View>

                <View style={Styles.card}>
                    <Text style={Styles.sectionHeader}>Chẩn đoán</Text>
                    <Text style={Styles.text}>{record.diagnosis || "Chưa có chẩn đoán"}</Text>
                </View>

                {record.symptoms && (
                    <View style={Styles.card}>
                        <Text style={Styles.sectionHeader}>Triệu chứng</Text>
                        <Text style={Styles.text}>{record.symptoms}</Text>
                    </View>
                )}

                {record.treatment_plan && (
                    <View style={Styles.card}>
                        <Text style={Styles.sectionHeader}>Phác đồ điều trị</Text>
                        <Text style={Styles.text}>{record.treatment_plan}</Text>
                    </View>
                )}

                {record.notes && (
                    <View style={Styles.card}>
                        <Text style={Styles.sectionHeader}>Ghi chú</Text>
                        <Text style={Styles.text}>{record.notes}</Text>
                    </View>
                )}

                {/* Test results */}
                {record.test_results && record.test_results.length > 0 && (
                    <View style={Styles.card}>
                        <Text style={Styles.sectionHeader}>Kết quả xét nghiệm</Text>
                        {record.test_results.map((t, i) => (
                            <View key={i} style={[S.testResult, i > 0 && { borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8, marginTop: 8 }]}>
                                <Text style={Styles.subtitle}>{t.test_name}</Text>
                                <Text style={Styles.text}>Kết quả: {t.result}</Text>
                                {t.normal_range && <Text style={Styles.textSmall}>Bình thường: {t.normal_range}</Text>}
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
};
export default MedicalRecords;