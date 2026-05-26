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
import Styles, { COLORS, doctorAppointmentDetailStyles as S } from "../../styles/Styles";

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
                <TextInput
                    label="Ngày tái khám (YYYY-MM-DD)"
                    value={form.follow_up_date}
                    onChangeText={(t) => setForm({ ...form, follow_up_date: t })}
                    mode="outlined" placeholder="2025-01-01"
                    style={S.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
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
                        {/* Danh sách thuốc đã thêm */}
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

                        {/* Thêm thuốc */}
                        <Text style={[S.subTitle, { marginTop: 12 }]}>Thêm thuốc vào đơn</Text>

                        {/* Chọn thuốc */}
                        <TouchableOpacity
                            style={S.pickerBtn}
                            onPress={() => setShowMedPicker(true)}
                        >
                            <Text style={{ color: medForm.medicine ? COLORS.text : COLORS.textLight }}>
                                {selectedMed ? `${selectedMed.code} - ${selectedMed.name}` : "Chọn thuốc..."}
                            </Text>
                            <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>

                        {showMedPicker && (
                            <View style={S.medDropdown}>
                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                    {allMedicines.map((m) => (
                                        <TouchableOpacity
                                            key={m.id}
                                            style={S.medOption}
                                            onPress={() => {
                                                setMedForm({ ...medForm, medicine: m.id });
                                                setShowMedPicker(false);
                                            }}
                                        >
                                            <Text style={S.medOptionText}>{m.code} - {m.name}</Text>
                                            <Text style={S.medOptionSub}>{m.unit} • {Number(m.price).toLocaleString("vi-VN")}đ</Text>
                                        </TouchableOpacity>
                                    ))}
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
            <ScrollView style={S.container}>
                {/* Status Header */}
                <View style={[S.statusHeader, { backgroundColor: statusCfg.color }]}>
                    <Text style={S.statusHeaderText}>{statusCfg.label}</Text>
                    <Text style={S.statusHeaderDate}>
                        {apptDate.toLocaleDateString("vi-VN")} lúc {apptDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                </View>

                {/* Patient Info */}
                <View style={S.card}>
                    <Text style={S.cardTitle}>Thông tin bệnh nhân</Text>
                    <InfoRow icon="account" label="Họ tên" value={patient.full_name} />
                    <InfoRow icon="phone" label="Điện thoại" value={patient.phone} />
                    <InfoRow icon="cake-variant" label="Ngày sinh" value={patient.date_of_birth} />
                </View>

                {/* Appointment Info */}
                <View style={S.card}>
                    <Text style={S.cardTitle}>Thông tin khám</Text>
                    <InfoRow icon="stethoscope" label="Bác sĩ" value={doctor.full_name} />
                    <InfoRow icon="hospital" label="Chuyên khoa" value={doctor.specialty_name} />
                    <InfoRow icon="text-box-outline" label="Lý do khám" value={appt.reason} />
                    <InfoRow icon="note-outline" label="Ghi chú" value={appt.notes} />
                </View>

                {/* Medical Record */}
                {record ? (
                    <View style={S.card}>
                        <View style={S.cardHeader}>
                            <Text style={S.cardTitle}>Hồ sơ bệnh án</Text>
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
                        <View style={S.emptyCard}>
                            <MaterialCommunityIcons name="file-document-outline" size={36} color={COLORS.border} />
                            <Text style={S.emptyText}>Chưa có hồ sơ bệnh án</Text>
                        </View>
                    )
                )}

                {/* Action Buttons */}
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
                            {record && (
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
export default DoctorAppointmentDetail;