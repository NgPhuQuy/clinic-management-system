import {
    View, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, ScrollView,
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../../configs/Apis";
import { MyUserContext } from "../../../contexts/MyContext";
import Styles, { COLORS } from "../../../styles/Styles";
import S from "./Styles";

const STATUS_CONFIG = {
    all:       { label: "Tất cả",       color: COLORS.textMuted },
    pending:   { label: "Chờ cấp phát", color: COLORS.orange },
    dispensed: { label: "Đã cấp phát",  color: COLORS.green },
    cancelled: { label: "Đã hủy",       color: COLORS.red },
};

const PrescriptionCard = ({ item, onDispense, onPress }) => {
    const cfg = STATUS_CONFIG[item.status] || {};
    const isPending = item.status === "pending";

    return (
        <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.85}>
            <View style={S.cardTop}>
                <MaterialCommunityIcons
                    name={isPending ? "pill" : "pill-multiple"}
                    size={22}
                    color={isPending ? COLORS.orange : COLORS.green}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={S.patientName} numberOfLines={1}>
                        {item.patient_name || `Bệnh nhân #${item.patient}`}
                    </Text>
                    <Text style={S.doctorName}>
                        BS. {item.doctor_name || `#${item.doctor}`}
                    </Text>
                </View>
                <View style={[S.statusBadge, { backgroundColor: cfg.color + "20" }]}>
                    <Text style={[S.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
            </View>

            {item.details?.length > 0 && (
                <View style={S.medList}>
                    {item.details.slice(0, 3).map((d, i) => (
                        <View key={i} style={S.medRow}>
                            <Text style={S.medBullet}>•</Text>
                            <Text style={S.medText} numberOfLines={1}>
                                {d.medicine_name} — {d.quantity} {d.medicine_unit}
                            </Text>
                        </View>
                    ))}
                    {item.details.length > 3 && (
                        <Text style={S.moreText}>+{item.details.length - 3} loại thuốc khác</Text>
                    )}
                </View>
            )}

            <View style={S.cardBottom}>
                <Text style={S.dateText}>
                    {new Date(item.created_at).toLocaleDateString("vi-VN")}
                </Text>
                {item.total_amount > 0 && (
                    <Text style={S.totalText}>
                        Tổng: {Number(item.total_amount).toLocaleString("vi-VN")}đ
                    </Text>
                )}
            </View>

            {isPending && (
                <TouchableOpacity
                    style={S.dispenseBtn}
                    onPress={() => onDispense(item)}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="package-up" size={16} color="#fff" />
                    <Text style={S.dispenseBtnText}>Cấp phát thuốc</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const PrescriptionDetail = ({ item, onClose, onDispense }) => {
    if (!item) return null;
    const isPending = item.status === "pending";
    return (
        <View style={S.detailOverlay}>
            <View style={S.detailBox}>
                <View style={S.detailHeader}>
                    <Text style={S.detailTitle}>Đơn thuốc #{item.id}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                </View>

                <Text style={S.detailPatient}>
                    Bệnh nhân: {item.patient_name}
                </Text>
                <Text style={S.detailDoctor}>
                    Bác sĩ: BS. {item.doctor_name}
                </Text>
                {item.notes ? (
                    <Text style={S.detailNotes}>Ghi chú: {item.notes}</Text>
                ) : null}

                <View style={S.divider} />

                <ScrollView style={{ maxHeight: 280 }}>
                    {item.details?.map((d) => (
                        <View key={d.id} style={S.detailMed}>
                            <Text style={S.detailMedName}>{d.medicine_name}</Text>
                            <View style={S.detailMedRow}>
                                <Text style={S.detailMedInfo}>
                                    Số lượng: {d.quantity} {d.medicine_unit}
                                </Text>
                                <Text style={S.detailMedInfo}>
                                    {Number(d.price_at_time).toLocaleString("vi-VN")}đ/{d.medicine_unit}
                                </Text>
                            </View>
                            <Text style={S.detailMedInfo}>
                                Liều: {d.dosage} | {d.frequency} | {d.duration_days} ngày
                            </Text>
                            {d.instructions ? (
                                <Text style={S.detailMedInstr}>{d.instructions}</Text>
                            ) : null}
                        </View>
                    ))}
                </ScrollView>

                <View style={S.detailTotal}>
                    <Text style={S.detailTotalLabel}>Tổng tiền thuốc:</Text>
                    <Text style={S.detailTotalValue}>
                        {Number(item.total_amount || 0).toLocaleString("vi-VN")}đ
                    </Text>
                </View>

                {isPending && (
                    <TouchableOpacity
                        style={S.dispenseBtn}
                        onPress={() => { onClose(); onDispense(item); }}
                    >
                        <MaterialCommunityIcons name="package-up" size={16} color="#fff" />
                        <Text style={S.dispenseBtnText}>Cấp phát thuốc</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const StaffPrescriptions = () => {
    const nav  = useNavigation();
    const user = useContext(MyUserContext);

    const [prescriptions, setPrescriptions] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [refreshing,    setRefreshing]    = useState(false);
    const [activeFilter,  setActiveFilter]  = useState("pending");
    const [selectedItem,  setSelectedItem]  = useState(null);
    const [dispensing,    setDispensing]    = useState(false);

    const load = async () => {
        try {
            const params = activeFilter !== "all" ? { status: activeFilter } : {};
            const res = await authApis(user.token).get(endpoints["prescriptions"], { params });
            setPrescriptions(res.data.results || res.data);
        } catch (e) {
            console.error(e?.response?.data || e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [activeFilter]);

    const dispense = (item) => {
        Alert.alert(
            "Xác nhận cấp phát thuốc",
            `Cấp phát ${item.details?.length || 0} loại thuốc cho bệnh nhân ${item.patient_name}?\n\nThao tác này sẽ tự động trừ kho theo FEFO.`,
            [
                { text: "Hủy bỏ", style: "cancel" },
                {
                    text: "Cấp phát",
                    onPress: async () => {
                        try {
                            setDispensing(true);
                            await authApis(user.token).post(
                                endpoints["prescription-dispense"](item.id)
                            );
                            setPrescriptions((prev) =>
                                prev.map((p) =>
                                    p.id === item.id ? { ...p, status: "dispensed" } : p
                                )
                            );
                            Alert.alert(
                                "✅ Thành công",
                                "Đã cấp phát thuốc và trừ kho thành công!\nThông báo đã gửi đến bệnh nhân."
                            );
                        } catch (e) {
                            const data = e?.response?.data;
                            const msg =
                                data?.detail ||
                                (data?.errors?.join("\n")) ||
                                "Không đủ thuốc trong kho hoặc có lỗi xảy ra!";
                            Alert.alert("❌ Lỗi cấp phát", msg);
                        } finally {
                            setDispensing(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={S.container}>
            <View style={S.filterBar}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={Object.entries(STATUS_CONFIG)}
                    keyExtractor={([k]) => k}
                    renderItem={({ item: [key, cfg] }) => (
                        <TouchableOpacity
                            style={[
                                S.chip,
                                activeFilter === key && {
                                    backgroundColor: cfg.color,
                                    borderColor: cfg.color,
                                },
                            ]}
                            onPress={() => setActiveFilter(key)}
                        >
                            <Text style={[S.chipText, activeFilter === key && { color: "#fff" }]}>
                                {cfg.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
                />
            </View>

            {loading ? (
                <View style={[Styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={prescriptions}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <PrescriptionCard
                            item={item}
                            onDispense={dispense}
                            onPress={() => setSelectedItem(item)}
                        />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(); }}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={[Styles.center, { marginTop: 60 }]}>
                            <MaterialCommunityIcons name="pill-off" size={52} color={COLORS.border} />
                            <Text style={S.emptyText}>
                                {activeFilter === "pending"
                                    ? "Không có đơn thuốc chờ cấp phát"
                                    : "Không có đơn thuốc nào"}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
                />
            )}

            {selectedItem && (
                <PrescriptionDetail
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onDispense={dispense}
                />
            )}
        </View>
    );
};

export default StaffPrescriptions;
