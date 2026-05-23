/**
 * screens/Doctor/DoctorAppointmentDetail.js
 * Chi tiết lịch hẹn cho bác sĩ: xem thông tin bệnh nhân,
 * ghi hồ sơ bệnh án, kê đơn thuốc, chuyển trạng thái
 */
import {
    View, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput as RNTextInput,
} from "react-native";
import { Text, Button, TextInput, HelperText } from "react-native-paper";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const STATUS_CONFIG = {
    pending: { label: "Chờ xác nhận", color: COLORS.orange },
    confirmed: { label: "Đã xác nhận", color: COLORS.green },
    in_progress: { label: "Đang khám", color: COLORS.purple },
    completed: { label: "Hoàn thành", color: COLORS.primary },
    cancelled: { label: "Đã hủy", color: COLORS.red },
    no_show: { label: "Không đến", color: COLORS.textLight },
};

const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
        <MaterialCommunityIcons name={icon} size={16} color={COLORS.primary} style={{ width: 22 }} />
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
    </View>
);

// Modal ghi hồ sơ bệnh án
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
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Ghi hồ sơ bệnh án</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
                <HelperText type="error" visible={!!err}>{err}</HelperText>

                <TextInput
                    label="Triệu chứng *"
                    value={form.symptoms}
                    onChangeText={(t) => setForm({ ...form, symptoms: t })}
                    mode="outlined" multiline numberOfLines={3}
                    style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <TextInput
                    label="Chẩn đoán *"
                    value={form.diagnosis}
                    onChangeText={(t) => setForm({ ...form, diagnosis: t })}
                    mode="outlined" multiline numberOfLines={3}
                    style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <TextInput
                    label="Hướng điều trị"
                    value={form.treatment_notes}
                    onChangeText={(t) => setForm({ ...form, treatment_notes: t })}
                    mode="outlined" multiline numberOfLines={3}
                    style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                />
                <TextInput
                    label="Ngày tái khám (YYYY-MM-DD)"
                    value={form.follow_up_date}
                    onChangeText={(t) => setForm({ ...form, follow_up_date: t })}
                    mode="outlined" placeholder="2025-01-01"
                    style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
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

// Modal kê đơn thuốc
const PrescriptionModal = ({ visible, onClose, medicalRecordId, patientId, onSuccess }) => {
    const user = useContext(MyUserContext);
    const [notes, setNotes] = useState("");
    const [medicines, setMedicines] = useState([]);
    const [prescriptionId, setPrescriptionId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [adding, setAdding] = useState(false);
    const [err, setErr] = useState(null);
    // Form thêm thuốc
    const [medForm, setMedForm] = useState({
        medicine: "", quantity: "", dosage: "", frequency: "", duration_days: "", instructions: "",
    });
    const [allMedicines, setAllMedicines] = useState([]);
    const [showMedPicker, setShowMedPicker] = useState(false);

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
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Kê đơn thuốc</Text>
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
                            style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
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
                        {/* Danh sách thuốc đã thêm */}
                        {medicines.length > 0 && (
                            <View style={styles.medList}>
                                <Text style={styles.subTitle}>Thuốc đã kê:</Text>
                                {medicines.map((m, i) => (
                                    <View key={i} style={styles.medItem}>
                                        <Text style={styles.medName}>{m.medicine_name || `Thuốc #${m.medicine}`}</Text>
                                        <Text style={styles.medDetail}>
                                            {m.quantity} {m.medicine_unit} • {m.dosage} • {m.frequency}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Thêm thuốc */}
                        <Text style={[styles.subTitle, { marginTop: 12 }]}>Thêm thuốc vào đơn</Text>

                        {/* Chọn thuốc */}
                        <TouchableOpacity
                            style={styles.pickerBtn}
                            onPress={() => setShowMedPicker(true)}
                        >
                            <Text style={{ color: medForm.medicine ? COLORS.text : COLORS.textLight }}>
                                {selectedMed ? `${selectedMed.code} - ${selectedMed.name}` : "Chọn thuốc..."}
                            </Text>
                            <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>

                        {showMedPicker && (
                            <View style={styles.medDropdown}>
                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                    {allMedicines.map((m) => (
                                        <TouchableOpacity
                                            key={m.id}
                                            style={styles.medOption}
                                            onPress={() => {
                                                setMedForm({ ...medForm, medicine: m.id });
                                                setShowMedPicker(false);
                                            }}
                                        >
                                            <Text style={styles.medOptionText}>{m.code} - {m.name}</Text>
                                            <Text style={styles.medOptionSub}>{m.unit} • {Number(m.price).toLocaleString("vi-VN")}đ</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.row}>
                            <TextInput
                                label="Số lượng *" value={medForm.quantity}
                                onChangeText={(t) => setMedForm({ ...medForm, quantity: t })}
                                mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]}
                                outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                            />
                            <TextInput
                                label="Số ngày dùng" value={medForm.duration_days}
                                onChangeText={(t) => setMedForm({ ...medForm, duration_days: t })}
                                mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]}
                                outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                            />
                        </View>
                        <TextInput
                            label="Liều dùng (vd: 1 viên)" value={medForm.dosage}
                            onChangeText={(t) => setMedForm({ ...medForm, dosage: t })}
                            mode="outlined" style={styles.input}
                            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        />
                        <TextInput
                            label="Tần suất (vd: 3 lần/ngày)" value={medForm.frequency}
                            onChangeText={(t) => setMedForm({ ...medForm, frequency: t })}
                            mode="outlined" style={styles.input}
                            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
                        />
                        <TextInput
                            label="Hướng dẫn sử dụng" value={medForm.instructions}
                            onChangeText={(t) => setMedForm({ ...medForm, instructions: t })}
                            mode="outlined" style={styles.input}
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

const DoctorAppointmentDetail = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { id } = route.params;

    const [appt, setAppt] = useState(null);
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showPrescModal, setShowPrescModal] = useState(false);

    const load = async () => {
        try {
            const res = await authApis(user.token).get(endpoints["appointment-detail"](id));
            setAppt(res.data);
            // Tìm hồ sơ bệnh án của lịch hẹn này
            try {
                const rRes = await authApis(user.token).get(endpoints["medical-records"], {
                    params: { appointment: id }
                });
                const records = rRes.data.results || rRes.data;
                if (records.length > 0) setRecord(records[0]);
            } catch (e) { /* no record yet */ }
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
            Alert.alert("Lỗi", e?.response?.data?.status?.[0] || "Không thể cập nhật!");
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
            <ScrollView style={styles.container}>
                {/* Status Header */}
                <View style={[styles.statusHeader, { backgroundColor: statusCfg.color }]}>
                    <Text style={styles.statusHeaderText}>{statusCfg.label}</Text>
                    <Text style={styles.statusHeaderDate}>
                        {apptDate.toLocaleDateString("vi-VN")} lúc {apptDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                </View>

                {/* Patient Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Thông tin bệnh nhân</Text>
                    <InfoRow icon="account" label="Họ tên" value={patient.full_name} />
                    <InfoRow icon="phone" label="Điện thoại" value={patient.phone} />
                    <InfoRow icon="cake-variant" label="Ngày sinh" value={patient.date_of_birth} />
                </View>

                {/* Appointment Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Thông tin khám</Text>
                    <InfoRow icon="stethoscope" label="Bác sĩ" value={doctor.full_name} />
                    <InfoRow icon="hospital" label="Chuyên khoa" value={doctor.specialty_name} />
                    <InfoRow icon="text-box-outline" label="Lý do khám" value={appt.reason} />
                    <InfoRow icon="note-outline" label="Ghi chú" value={appt.notes} />
                </View>

                {/* Medical Record */}
                {record ? (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Hồ sơ bệnh án</Text>
                            <TouchableOpacity onPress={() => nav.navigate("doctor-medical-record-detail", { id: record.id })}>
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
                        <View style={styles.emptyCard}>
                            <MaterialCommunityIcons name="file-document-outline" size={36} color={COLORS.border} />
                            <Text style={styles.emptyText}>Chưa có hồ sơ bệnh án</Text>
                        </View>
                    )
                )}

                {/* Action Buttons */}
                <View style={styles.actions}>
                    {appt.status === "confirmed" && (
                        <Button
                            mode="contained"
                            icon="stethoscope"
                            onPress={() => updateStatus("in_progress")}
                            style={[styles.btn, { backgroundColor: COLORS.purple }]}
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
                                style={[styles.btn, { backgroundColor: COLORS.green }]}
                            >
                                Xác nhận lịch hẹn
                            </Button>
                            <Button
                                mode="outlined"
                                icon="close-circle-outline"
                                onPress={() => updateStatus("cancelled")}
                                style={styles.btn}
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
                                    style={[styles.btn, { backgroundColor: COLORS.primary }]}
                                >
                                    Ghi hồ sơ bệnh án
                                </Button>
                            )}
                            {record && (
                                <Button
                                    mode="contained"
                                    icon="pill"
                                    onPress={() => setShowPrescModal(true)}
                                    style={[styles.btn, { backgroundColor: COLORS.orange }]}
                                >
                                    Kê đơn thuốc
                                </Button>
                            )}
                            <Button
                                mode="contained"
                                icon="check-all"
                                onPress={() => updateStatus("completed")}
                                style={[styles.btn, { backgroundColor: COLORS.green }]}
                            >
                                Hoàn thành khám
                            </Button>
                            <Button
                                mode="outlined"
                                icon="account-off-outline"
                                onPress={() => updateStatus("no_show")}
                                style={styles.btn}
                                textColor={COLORS.textMuted}
                            >
                                Bệnh nhân không đến
                            </Button>
                        </>
                    )}
                </View>

                <View style={{ height: 24 }} />
            </ScrollView>

            {/* Modals */}
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
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    statusHeader: { padding: 20, alignItems: "center" },
    statusHeaderText: { fontSize: 18, fontWeight: "800", color: "#fff" },
    statusHeaderDate: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },
    card: {
        margin: 16, marginBottom: 0, backgroundColor: "#fff",
        borderRadius: 14, padding: 16, elevation: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
    infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
    infoLabel: { fontSize: 13, color: COLORS.textMuted, marginLeft: 4, marginRight: 6, minWidth: 80 },
    infoValue: { fontSize: 13, color: COLORS.text, flex: 1, fontWeight: "500" },
    emptyCard: {
        margin: 16, marginBottom: 0, backgroundColor: "#fff",
        borderRadius: 14, padding: 24, alignItems: "center",
        elevation: 1,
    },
    emptyText: { color: COLORS.textMuted, marginTop: 8, fontSize: 14 },
    actions: { margin: 16, gap: 10 },
    btn: { borderRadius: 10, paddingVertical: 4 },
    // Modal styles
    modalHeader: {
        backgroundColor: COLORS.primaryDark,
        paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
    input: { backgroundColor: "#fff", marginBottom: 10 },
    row: { flexDirection: "row", gap: 10 },
    subTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
    medList: {
        backgroundColor: COLORS.primaryPale, borderRadius: 10,
        padding: 12, marginBottom: 12,
    },
    medItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    medName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
    medDetail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    pickerBtn: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
        padding: 14, backgroundColor: "#fff", marginBottom: 10,
    },
    medDropdown: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
        backgroundColor: "#fff", marginBottom: 10, overflow: "hidden",
    },
    medOption: {
        padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    medOptionText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
    medOptionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});

export default DoctorAppointmentDetail;