import {
    View, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput as RNTextInput,
} from "react-native";
import { Text, Button, TextInput, HelperText } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS, doctorAppointmentDetailStyles as S } from "../../styles/Styles";
import { DatePickerField } from "../../components/DatePickerField";
import {
    doctorAppointmentDetailPdStyles as pdStyles,
    doctorAppointmentDetailTestStyles as testStyles,
    doctorAppointmentDetailMdStyles as mdStyles,
} from "./Styles";

const STATUS_CONFIG = {
    pending: { label: "Chờ xác nhận", color: COLORS.orange },
    confirmed: { label: "Đã xác nhận", color: COLORS.green },
    in_progress: { label: "Đang khám", color: COLORS.purple },
    completed: { label: "Hoàn thành", color: COLORS.primary },
    cancelled: { label: "Đã hủy", color: COLORS.red },
    no_show: { label: "Không đến", color: COLORS.textLight },
};

const InfoRow = ({ icon, label, value }) => (
    <View style={S.infoRow}>
        <MaterialCommunityIcons name={icon} size={16} color={COLORS.primary} style={{ width: 22 }} />
        <Text style={S.infoLabel}>{label}:</Text>
        <Text style={S.infoValue}>{value || "—"}</Text>
    </View>
);

const MedicalRecordModal = ({ visible, onClose, appointmentId, patientId, onSuccess }) => {
    const user = useContext(MyUserContext);
    const [form, setForm] = useState({
        diagnosis: "", symptoms: "", treatment_notes: "", follow_up_date: "",
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    const save = async () => {
        if (!form.diagnosis.trim()) { setErr("Vui lòng nhập chẩn đoán!"); return; }
        try {
            setSaving(true);
            setErr(null);
            await authApis(user.token).post(endpoints["medical-records"], {
                appointment: appointmentId,
                patient: patientId,
                ...form,
            });
            onSuccess();
            onClose();
        } catch (e) {
            setErr(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || "Lỗi lưu hồ sơ!");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={S.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={S.modalTitle}>Ghi hồ sơ bệnh án</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                <TextInput
                    label="Triệu chứng *"
                    value={form.symptoms}
                    onChangeText={(t) => setForm({ ...form, symptoms: t })}
                    mode="outlined" multiline numberOfLines={3}
                    style={S.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <TextInput
                    label="Chẩn đoán *"
                    value={form.diagnosis}
                    onChangeText={(t) => setForm({ ...form, diagnosis: t })}
                    mode="outlined" multiline numberOfLines={3}
                    style={S.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <TextInput
                    label="Hướng điều trị"
                    value={form.treatment_notes}
                    onChangeText={(t) => setForm({ ...form, treatment_notes: t })}
                    mode="outlined" multiline numberOfLines={3}
                    style={S.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <DatePickerField
                    label="Ngày tái khám"
                    value={form.follow_up_date}
                    onChange={(v) => setForm({ ...form, follow_up_date: v })}
                    clearLabel="Xóa ngày tái khám"
                />
                <Button
                    mode="contained" onPress={save} loading={saving} disabled={saving}
                    style={{ marginTop: 8, borderRadius: 10 }} buttonColor={COLORS.primary}
                >
                    Lưu hồ sơ bệnh án
                </Button>
            </ScrollView>
        </Modal>
    );
};

const PrescriptionModal = ({ visible, onClose, medicalRecordId, patientId, onSuccess }) => {
    const user = useContext(MyUserContext);
    const [notes, setNotes] = useState("");
    const [medicines, setMedicines] = useState([]);
    const [prescriptionId, setPrescriptionId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [adding, setAdding] = useState(false);
    const [err, setErr] = useState(null);
    const [medForm, setMedForm] = useState({
        medicine: "", quantity: "", dosage: "", frequency: "", duration_days: "", instructions: "",
    });
    const [allMedicines, setAllMedicines] = useState([]);
    const [showMedPicker, setShowMedPicker] = useState(false);
    const [medSearch, setMedSearch] = useState("");

    useEffect(() => {
        if (visible) loadMedicines();
    }, [visible]);

    const loadMedicines = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["medicines"]);
            setAllMedicines(res.data.results || res.data);
        } catch (e) { console.error(e); }
    };

    const createPrescription = async () => {
        if (!medicalRecordId) { setErr("Cần ghi hồ sơ bệnh án trước!"); return; }
        try {
            setSaving(true); setErr(null);
            const res = await authApis(user.token).post(endpoints["prescriptions"], {
                medical_record: medicalRecordId,
                patient: patientId,
                notes,
            });
            setPrescriptionId(res.data.id);
        } catch (e) {
            setErr(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || "Lỗi tạo đơn!");
        } finally {
            setSaving(false);
        }
    };

    const addMedicine = async () => {
        if (!prescriptionId) { setErr("Vui lòng tạo đơn thuốc trước!"); return; }
        if (!medForm.medicine || !medForm.quantity || !medForm.dosage) {
            setErr("Vui lòng điền đầy đủ thông tin thuốc!"); return;
        }
        try {
            setAdding(true); setErr(null);
            const res = await authApis(user.token).post(
                endpoints["prescription-add-medicine"](prescriptionId),
                {
                    medicine: medForm.medicine,
                    quantity: parseInt(medForm.quantity),
                    dosage: medForm.dosage,
                    frequency: medForm.frequency,
                    duration_days: parseInt(medForm.duration_days) || 1,
                    instructions: medForm.instructions,
                }
            );
            setMedicines([...medicines, res.data]);
            setMedForm({ medicine: "", quantity: "", dosage: "", frequency: "", duration_days: "", instructions: "" });
        } catch (e) {
            setErr(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || "Lỗi thêm thuốc!");
        } finally {
            setAdding(false);
        }
    };

    const done = () => { onSuccess(); onClose(); setPrescriptionId(null); setMedicines([]); setNotes(""); };

    const selectedMed = allMedicines.find((m) => m.id === medForm.medicine);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={S.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={S.modalTitle}>Kê đơn thuốc</Text>
                {prescriptionId ? (
                    <TouchableOpacity onPress={done}>
                        <Text style={{ color: "#fff", fontWeight: "700" }}>Xong</Text>
                    </TouchableOpacity>
                ) : <View style={{ width: 40 }} />}
            </View>

            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                {!prescriptionId ? (
                    <>
                        <TextInput
                            label="Ghi chú đơn thuốc"
                            value={notes}
                            onChangeText={setNotes}
                            mode="outlined" multiline numberOfLines={3}
                            style={S.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        />
                        <Button
                            mode="contained" onPress={createPrescription} loading={saving}
                            style={{ borderRadius: 10 }} buttonColor={COLORS.primary}
                        >
                            Tạo đơn thuốc
                        </Button>
                    </>
                ) : (
                    <>
                        {medicines.length > 0 && (
                            <View style={S.medList}>
                                <Text style={S.subTitle}>Thuốc đã kê:</Text>
                                {medicines.map((m, i) => (
                                    <View key={i} style={S.medItem}>
                                        <Text style={S.medName}>{m.medicine_name || `Thuốc #${m.medicine}`}</Text>
                                        <Text style={S.medDetail}>
                                            {m.quantity} {m.medicine_unit} • {m.dosage} • {m.frequency}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <Text style={[S.subTitle, { marginTop: 12 }]}>Thêm thuốc vào đơn</Text>

                        <TouchableOpacity
                            style={S.pickerBtn}
                            onPress={() => { setShowMedPicker(v => !v); setMedSearch(""); }}
                        >
                            <Text style={{ color: medForm.medicine ? COLORS.text : COLORS.textLight }}>
                                {selectedMed ? `${selectedMed.code} - ${selectedMed.name}` : "Chọn thuốc..."}
                            </Text>
                            <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>

                        {showMedPicker && (
                            <View style={S.medDropdown}>
                                <RNTextInput
                                    value={medSearch}
                                    onChangeText={setMedSearch}
                                    placeholder="Tìm theo tên hoặc mã thuốc..."
                                    placeholderTextColor={COLORS.textLight}
                                    style={mdStyles.searchInput}
                                    autoFocus
                                />
                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                    {allMedicines
                                        .filter(m => {
                                            const q = medSearch.toLowerCase();
                                            return !q || m.name.toLowerCase().includes(q) || (m.code || "").toLowerCase().includes(q);
                                        })
                                        .map((m) => (
                                            <TouchableOpacity
                                                key={m.id}
                                                style={S.medOption}
                                                onPress={() => {
                                                    setMedForm({ ...medForm, medicine: m.id });
                                                    setShowMedPicker(false);
                                                    setMedSearch("");
                                                }}
                                            >
                                                <Text style={S.medOptionText}>{m.code} - {m.name}</Text>
                                                <Text style={S.medOptionSub}>{m.unit} • {Number(m.price).toLocaleString("vi-VN")}đ</Text>
                                            </TouchableOpacity>
                                        ))
                                    }
                                </ScrollView>
                            </View>
                        )}

                        <View style={S.row}>
                            <TextInput
                                label="Số lượng *" value={medForm.quantity}
                                onChangeText={(t) => setMedForm({ ...medForm, quantity: t })}
                                mode="outlined" keyboardType="numeric" style={[S.input, { flex: 1 }]}
                                outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                            />
                            <TextInput
                                label="Số ngày dùng" value={medForm.duration_days}
                                onChangeText={(t) => setMedForm({ ...medForm, duration_days: t })}
                                mode="outlined" keyboardType="numeric" style={[S.input, { flex: 1 }]}
                                outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                            />
                        </View>
                        <TextInput
                            label="Liều dùng (vd: 1 viên)" value={medForm.dosage}
                            onChangeText={(t) => setMedForm({ ...medForm, dosage: t })}
                            mode="outlined" style={S.input}
                            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        />
                        <TextInput
                            label="Tần suất (vd: 3 lần/ngày)" value={medForm.frequency}
                            onChangeText={(t) => setMedForm({ ...medForm, frequency: t })}
                            mode="outlined" style={S.input}
                            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        />
                        <TextInput
                            label="Hướng dẫn sử dụng" value={medForm.instructions}
                            onChangeText={(t) => setMedForm({ ...medForm, instructions: t })}
                            mode="outlined" style={S.input}
                            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        />
                        <Button
                            mode="outlined" onPress={addMedicine} loading={adding}
                            style={{ borderRadius: 10, marginBottom: 8 }} textColor={COLORS.primary}
                        >
                            + Thêm thuốc
                        </Button>
                        <Button
                            mode="contained" onPress={done}
                            style={{ borderRadius: 10 }} buttonColor={COLORS.green}
                        >
                            Hoàn tất kê đơn
                        </Button>
                    </>
                )}
            </ScrollView>
        </Modal>
    );
};

const PrescriptionDetailModal = ({ visible, prescription, onClose }) => {
    if (!prescription) return null;
    const isDispensed = prescription.status === "dispensed";
    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={S.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={S.modalTitle}>Đơn thuốc #{prescription.id}</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
                <View style={pdStyles.statusRow}>
                    <MaterialCommunityIcons name="pill" size={20} color={COLORS.orange} />
                    <View style={[pdStyles.badge, { backgroundColor: isDispensed ? COLORS.green + "22" : COLORS.orange + "22" }]}>
                        <Text style={[pdStyles.badgeText, { color: isDispensed ? COLORS.green : COLORS.orange }]}>
                            {isDispensed ? "Đã cấp phát" : "Chờ cấp phát"}
                        </Text>
                    </View>
                    <Text style={pdStyles.dateText}>
                        {new Date(prescription.created_at).toLocaleDateString("vi-VN")}
                    </Text>
                </View>

                {prescription.notes ? (
                    <View style={pdStyles.notesBox}>
                        <Text style={pdStyles.notesLabel}>Ghi chú đơn thuốc</Text>
                        <Text style={pdStyles.notesText}>{prescription.notes}</Text>
                    </View>
                ) : null}

                <Text style={pdStyles.sectionTitle}>
                    DANH SÁCH THUỐC ({prescription.details?.length || 0} loại)
                </Text>
                {(prescription.details || []).map((d, idx) => (
                    <View key={d.id ?? idx} style={pdStyles.medCard}>
                        <View style={pdStyles.medCardTop}>
                            <Text style={pdStyles.medName} numberOfLines={1}>{d.medicine_name}</Text>
                            <Text style={pdStyles.medAmount}>
                                {Number(d.subtotal || 0).toLocaleString("vi-VN")}đ
                            </Text>
                        </View>
                        <View style={pdStyles.medMeta}>
                            <Text style={pdStyles.metaItem}>
                                <Text style={pdStyles.metaLabel}>Số lượng: </Text>
                                {d.quantity} {d.medicine_unit}
                            </Text>
                            <Text style={pdStyles.metaItem}>
                                <Text style={pdStyles.metaLabel}>Liều dùng: </Text>
                                {d.dosage}
                            </Text>
                            {!!d.frequency && (
                                <Text style={pdStyles.metaItem}>
                                    <Text style={pdStyles.metaLabel}>Tần suất: </Text>
                                    {d.frequency}
                                </Text>
                            )}
                            {!!d.duration_days && (
                                <Text style={pdStyles.metaItem}>
                                    <Text style={pdStyles.metaLabel}>Thời gian: </Text>
                                    {d.duration_days} ngày
                                </Text>
                            )}
                            {!!d.instructions && (
                                <Text style={pdStyles.metaItem}>
                                    <Text style={pdStyles.metaLabel}>Hướng dẫn: </Text>
                                    {d.instructions}
                                </Text>
                            )}
                        </View>
                    </View>
                ))}

                <View style={pdStyles.totalRow}>
                    <Text style={pdStyles.totalLabel}>Tổng cộng</Text>
                    <Text style={pdStyles.totalValue}>
                        {Number(prescription.total_amount || 0).toLocaleString("vi-VN")}đ
                    </Text>
                </View>
                <View style={{ height: 16 }} />
            </ScrollView>
        </Modal>
    );
};


const DoctorAppointmentDetail = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { id } = route.params;

    const [appt, setAppt] = useState(null);
    const [record, setRecord] = useState(null);
    const [prescription, setPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showPrescModal, setShowPrescModal] = useState(false);
    const [showPrescDetail, setShowPrescDetail] = useState(false);

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["appointment-detail"](id));
            setAppt(res.data);
            try {
                const rRes = await authApis(user.token).get(endpoints["medical-records"], {
                    params: { appointment: id }
                });
                const records = rRes.data.results || rRes.data;
                if (records.length > 0) {
                    setRecord(records[0]);
                    try {
                        const pRes = await authApis(user.token).get(endpoints["prescriptions"], {
                            params: { medical_record: records[0].id }
                        });
                        const prescs = pRes.data.results || pRes.data;
                        if (prescs.length > 0) setPrescription(prescs[0]);
                        else setPrescription(null);
                    } catch (_) { setPrescription(null); }
                }
            } catch (e) {}
        } catch (e) {
            console.error(e?.response?.data || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const updateStatus = async (newStatus) => {
        try {
            await authApis(user.token).patch(endpoints["appointment-status"](id), { status: newStatus });
            setAppt({ ...appt, status: newStatus });
        } catch (e) {
            const data = e?.response?.data;
            console.error("updateStatus error:", data ?? e);
            let msg = "Không thể cập nhật!";
            if (data) {
                if (typeof data === "string") msg = data;
                else if (data.detail) msg = data.detail;
                else if (data.status?.[0]) msg = data.status[0];
                else msg = Object.values(data).flat().join("\n");
            }
            Alert.alert("Lỗi", msg);
        }
    };

    if (loading) return (
        <View style={[Styles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );
    if (!appt) return <View style={[Styles.center, { flex: 1 }]}><Text>Không tìm thấy lịch hẹn</Text></View>;

    const statusCfg = STATUS_CONFIG[appt.status] || {};
    const patient = appt.patient_info || {};
    const doctor = appt.doctor_info || {};
    const apptDate = new Date(appt.appointment_date);

    return (
        <>
            <ScrollView style={S.container}>
                <View style={[S.statusHeader, { backgroundColor: statusCfg.color }]}>
                    <Text style={S.statusHeaderText}>{statusCfg.label}</Text>
                    <Text style={S.statusHeaderDate}>
                        {apptDate.toLocaleDateString("vi-VN")} lúc {apptDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                </View>

                <View style={S.card}>
                    <Text style={S.cardTitle}>Thông tin bệnh nhân</Text>
                    <InfoRow icon="account" label="Họ tên" value={patient.full_name} />
                    <InfoRow icon="phone" label="Điện thoại" value={patient.phone} />
                    <InfoRow icon="cake-variant" label="Ngày sinh" value={patient.date_of_birth} />
                </View>

                <View style={S.card}>
                    <Text style={S.cardTitle}>Thông tin khám</Text>
                    <InfoRow icon="stethoscope" label="Bác sĩ" value={doctor.full_name} />
                    <InfoRow icon="hospital" label="Chuyên khoa" value={doctor.specialty_name} />
                    <InfoRow icon="text-box-outline" label="Lý do khám" value={appt.reason} />
                    <InfoRow icon="note-outline" label="Ghi chú" value={appt.notes} />
                </View>

                {appt.consultation_id && !["cancelled", "no_show"].includes(appt.status) && (
                    <TouchableOpacity
                        style={[S.card, { borderLeftWidth: 4, borderLeftColor: COLORS.purple }]}
                        onPress={() => nav.navigate("consultation-room", { consultationId: appt.consultation_id })}
                        activeOpacity={0.85}
                    >
                        <View style={S.cardHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                                <MaterialCommunityIcons name="video-outline" size={20} color={COLORS.purple} />
                                <Text style={[S.cardTitle, { color: COLORS.purple }]}>Phòng khám trực tuyến</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Text style={{ color: COLORS.purple, fontWeight: "600", fontSize: 13 }}>Vào phòng</Text>
                                <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.purple} />
                            </View>
                        </View>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                            Chat · Video call · Phòng chờ trực tuyến
                        </Text>
                    </TouchableOpacity>
                )}

                {record ? (
                    <View style={S.card}>
                        <View style={S.cardHeader}>
                            <Text style={S.cardTitle}>Hồ sơ bệnh án</Text>
                            <TouchableOpacity onPress={() => nav.navigate("doctor-medical-record-detail", { id: record.id, appointmentStatus: appt?.status })}>
                                <Text style={{ color: COLORS.primary, fontWeight: "600", fontSize: 13 }}>Xem chi tiết</Text>
                            </TouchableOpacity>
                        </View>
                        <InfoRow icon="magnify" label="Triệu chứng" value={record.symptoms} />
                        <InfoRow icon="clipboard-pulse" label="Chẩn đoán" value={record.diagnosis} />
                        <InfoRow icon="medical-bag" label="Điều trị" value={record.treatment_notes} />
                        {record.follow_up_date && (
                            <InfoRow icon="calendar-refresh" label="Tái khám" value={record.follow_up_date} />
                        )}
                    </View>
                ) : (
                    appt.status === "in_progress" && (
                        <View style={S.emptyCard}>
                            <MaterialCommunityIcons name="file-document-outline" size={36} color={COLORS.border} />
                            <Text style={S.emptyText}>Chưa có hồ sơ bệnh án</Text>
                        </View>
                    )
                )}

                {record && (
                    <View style={S.card}>
                        <View style={S.cardHeader}>
                            <Text style={S.cardTitle}>
                                Cận lâm sàng ({record.test_results?.length || 0})
                            </Text>
                            <TouchableOpacity onPress={() => nav.navigate("doctor-medical-record-detail", { id: record.id, appointmentStatus: appt.status })}>
                                <Text style={{ color: COLORS.primary, fontWeight: "600", fontSize: 13 }}>
                                    {appt.status === "in_progress" ? "Thêm / Quản lý" : "Xem chi tiết"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {record.test_results?.length > 0 ? (
                            record.test_results.map(t => (
                                <View key={t.id} style={testStyles.row}>
                                    <View style={[testStyles.dot, { backgroundColor: t.status === "completed" ? COLORS.green : COLORS.orange }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={testStyles.name} numberOfLines={1}>{t.test_name}</Text>
                                        {t.result ? (
                                            <Text style={testStyles.result}>KQ: {t.result} {t.unit || ""}</Text>
                                        ) : (
                                            <Text style={testStyles.pending}>Chờ kết quả</Text>
                                        )}
                                    </View>
                                    <View style={[testStyles.badge, { backgroundColor: t.status === "completed" ? COLORS.green + "20" : COLORS.orange + "20" }]}>
                                        <Text style={[testStyles.badgeText, { color: t.status === "completed" ? COLORS.green : COLORS.orange }]}>
                                            {t.status === "completed" ? "Có KQ" : "Chờ KQ"}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Chưa có xét nghiệm nào</Text>
                        )}
                    </View>
                )}

                {prescription ? (
                    <TouchableOpacity style={S.card} onPress={() => setShowPrescDetail(true)} activeOpacity={0.8}>
                        <View style={S.cardHeader}>
                            <Text style={S.cardTitle}>Đơn thuốc</Text>
                            <View style={{
                                borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3,
                                backgroundColor: prescription.status === "dispensed" ? COLORS.green + "22" : COLORS.orange + "22",
                            }}>
                                <Text style={{
                                    fontSize: 11, fontWeight: "700",
                                    color: prescription.status === "dispensed" ? COLORS.green : COLORS.orange,
                                }}>
                                    {prescription.status === "dispensed" ? "Đã cấp phát" : "Chờ cấp phát"}
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                                {prescription.details?.length || 0} loại thuốc
                                {prescription.total_amount ? ` • ${Number(prescription.total_amount).toLocaleString("vi-VN")}đ` : ""}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: "600" }}>Xem chi tiết</Text>
                                <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.primary} />
                            </View>
                        </View>
                    </TouchableOpacity>
                ) : null}

                <View style={S.actions}>
                    {appt.status === "confirmed" && (
                        <Button
                            mode="contained"
                            icon="stethoscope"
                            onPress={() => updateStatus("in_progress")}
                            style={[S.btn, { backgroundColor: COLORS.purple }]}
                        >
                            Bắt đầu khám
                        </Button>
                    )}
                    {appt.status === "pending" && (
                        <>
                            <Button
                                mode="contained"
                                icon="check-circle-outline"
                                onPress={() => updateStatus("confirmed")}
                                style={[S.btn, { backgroundColor: COLORS.green }]}
                            >
                                Xác nhận lịch hẹn
                            </Button>
                            <Button
                                mode="outlined"
                                icon="close-circle-outline"
                                onPress={() => updateStatus("cancelled")}
                                style={S.btn}
                                textColor={COLORS.red}
                            >
                                Hủy lịch
                            </Button>
                        </>
                    )}
                    {appt.status === "in_progress" && (
                        <>
                            {!record && (
                                <Button
                                    mode="contained"
                                    icon="file-edit-outline"
                                    onPress={() => setShowRecordModal(true)}
                                    style={[S.btn, { backgroundColor: COLORS.primary }]}
                                >
                                    Ghi hồ sơ bệnh án
                                </Button>
                            )}
                            {record && !prescription && (
                                <Button
                                    mode="contained"
                                    icon="pill"
                                    onPress={() => setShowPrescModal(true)}
                                    style={[S.btn, { backgroundColor: COLORS.orange }]}
                                >
                                    Kê đơn thuốc
                                </Button>
                            )}
                            <Button
                                mode="contained"
                                icon="check-all"
                                onPress={() => updateStatus("completed")}
                                style={[S.btn, { backgroundColor: COLORS.green }]}
                            >
                                Hoàn thành khám
                            </Button>
                            <Button
                                mode="outlined"
                                icon="account-off-outline"
                                onPress={() => updateStatus("no_show")}
                                style={S.btn}
                                textColor={COLORS.textMuted}
                            >
                                Bệnh nhân không đến
                            </Button>
                        </>
                    )}
                </View>

                <View style={{ height: 24 }} />
            </ScrollView>

            <MedicalRecordModal
                visible={showRecordModal}
                onClose={() => setShowRecordModal(false)}
                appointmentId={appt.id}
                patientId={appt.patient}
                onSuccess={() => { load(); }}
            />
            <PrescriptionModal
                visible={showPrescModal}
                onClose={() => setShowPrescModal(false)}
                medicalRecordId={record?.id}
                patientId={appt.patient}
                onSuccess={() => { load(); }}
            />
            <PrescriptionDetailModal
                visible={showPrescDetail}
                prescription={prescription}
                onClose={() => setShowPrescDetail(false)}
            />
        </>
    );
};

export default DoctorAppointmentDetail;