/**
 * screens/Appointment/BookAppointment.js
 * Đặt lịch hẹn với bác sĩ – có calendar picker & time slot picker
 */
import {
    View, ScrollView, TouchableOpacity, Modal,
    ActivityIndicator, Dimensions,
} from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useState, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";

const { width: SCREEN_W } = Dimensions.get("window");
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = [
    "Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
    "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12",
];
const TIME_SLOTS = [
    "07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00",
    "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30",
];

// ─── Mini calendar component ─────────────────────────────────────────────────
const CalendarPicker = ({ selectedDate, onSelect, onClose }) => {
    const today = new Date();
    today.setHours(0,0,0,0);

    const [viewYear,  setViewYear]  = useState(selectedDate ? selectedDate.getFullYear()  : today.getFullYear());
    const [viewMonth, setViewMonth] = useState(selectedDate ? selectedDate.getMonth()      : today.getMonth());

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const DAY_SIZE = Math.floor((SCREEN_W - 80) / 7);

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <View style={Styles.calendarWrap}>
            {/* Month nav */}
            <View style={Styles.calendarHeader}>
                <TouchableOpacity onPress={prevMonth} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={Styles.calendarMonthTxt}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={{ flexDirection: "row" }}>
                {DAY_NAMES.map(d => (
                    <Text key={d} style={[Styles.calendarDayName, { width: DAY_SIZE }]}>{d}</Text>
                ))}
            </View>

            {/* Day cells */}
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {cells.map((day, idx) => {
                    if (!day) return <View key={`e${idx}`} style={{ width: DAY_SIZE, height: DAY_SIZE }} />;
                    const cellDate = new Date(viewYear, viewMonth, day);
                    const isPast     = cellDate < today;
                    const isToday    = cellDate.getTime() === today.getTime();
                    const isSelected = selectedDate && cellDate.getTime() === new Date(
                        selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()
                    ).getTime();
                    return (
                        <TouchableOpacity
                            key={day}
                            disabled={isPast}
                            onPress={() => onSelect(cellDate)}
                            style={[
                                Styles.calendarDay,
                                { width: DAY_SIZE, height: DAY_SIZE, margin: 1 },
                                isToday    && Styles.calendarDayToday,
                                isSelected && Styles.calendarDaySelected,
                                isPast     && Styles.calendarDayDisabled,
                            ]}
                        >
                            <Text style={[
                                Styles.calendarDayText,
                                isSelected && Styles.calendarDaySelectedText,
                            ]}>
                                {day}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// ─── Time slot picker ────────────────────────────────────────────────────────
const TimePicker = ({ selectedTime, onSelect }) => (
    <View style={Styles.timeSlotRow}>
        {TIME_SLOTS.map(t => (
            <TouchableOpacity
                key={t}
                style={[Styles.timeSlot, selectedTime === t && Styles.timeSlotSelected]}
                onPress={() => onSelect(t)}
            >
                <Text style={[Styles.timeSlotText, selectedTime === t && Styles.timeSlotTextSelected]}>
                    {t}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
);

// ─── Main screen ─────────────────────────────────────────────────────────────
const BookAppointment = () => {
    const nav    = useNavigation();
    const route  = useRoute();
    const user   = useContext(MyUserContext);
    const { doctorId, scheduleId, doctorName, schedule } = route.params || {};

    const initDate = schedule?.date ? new Date(schedule.date) : null;
    const initTime = schedule?.start_time?.slice(0,5) || "";

    const [selectedDate, setSelectedDate] = useState(initDate);
    const [selectedTime, setSelectedTime] = useState(initTime);
    const [showCal,  setShowCal]  = useState(false);
    const [reason,   setReason]   = useState("");
    const [notes,    setNotes]    = useState("");
    const [loading,  setLoading]  = useState(false);
    const [err,      setErr]      = useState(null);

    const formattedDate = selectedDate
        ? selectedDate.toLocaleDateString("vi-VN", { weekday:"long", day:"2-digit", month:"2-digit", year:"numeric" })
        : "Chọn ngày khám";

    const appointmentDatetime = selectedDate && selectedTime
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,"0")}-${String(selectedDate.getDate()).padStart(2,"0")}T${selectedTime}`
        : "";

    const validate = () => {
        if (!doctorId)        { setErr("Vui lòng chọn bác sĩ trước khi đặt lịch!"); return false; }
        if (!selectedDate)    { setErr("Vui lòng chọn ngày khám!"); return false; }
        if (!selectedTime)    { setErr("Vui lòng chọn giờ khám!"); return false; }
        if (!reason.trim())   { setErr("Vui lòng nhập lý do khám!"); return false; }
        return true;
    };

    const book = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            setErr(null);
            const payload = {
                doctor:           doctorId,
                appointment_date: appointmentDatetime,
                reason,
                notes,
            };
            if (scheduleId) payload.schedule = scheduleId;

            const res = await authApis(user.token).post(endpoints["appointments"], payload);
            if (res.status === 201) {
                const appt = res.data;
                nav.navigate("payment-screen", {
                    appointmentId:   appt.id,
                    doctorName,
                    appointmentDate: appt.appointment_date,
                    amount:          appt.payment?.amount ?? 0,
                    fromBooking:     true,
                });
            }
        } catch (ex) {
            const detail = ex?.response?.data;
            let msg = "Đặt lịch thất bại. Vui lòng thử lại!";
            if (detail) {
                if (typeof detail === "string") msg = detail;
                else if (detail.detail) msg = detail.detail;
                else msg = Object.entries(detail)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                    .join("\n");
            }
            setErr(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={Styles.container} keyboardShouldPersistTaps="handled">
            <View style={Styles.bookForm}>
                <Text style={Styles.title}>Đặt lịch hẹn</Text>

                {/* Doctor info */}
                <View style={[Styles.card, { backgroundColor: COLORS.primaryPale, marginBottom: 16 }]}>
                    <Text style={Styles.sectionHeader}>Thông tin bác sĩ</Text>
                    <Text style={Styles.text}>👨‍⚕️ BS. {doctorName}</Text>
                    {schedule && (
                        <>
                            <Text style={Styles.text}>📅 {new Date(schedule.date).toLocaleDateString("vi-VN")}</Text>
                            <Text style={Styles.text}>🕐 {schedule.start_time} – {schedule.end_time}</Text>
                        </>
                    )}
                </View>

                <HelperText type="error" visible={!!err}>{err}</HelperText>

                {/* Date picker trigger */}
                <Text style={[Styles.subtitle, { marginBottom: 8 }]}>📅 Chọn ngày khám *</Text>
                <TouchableOpacity
                    style={Styles.datePickerBtn}
                    onPress={() => setShowCal(v => !v)}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="calendar-month" size={22} color={COLORS.primary} />
                    <Text style={Styles.datePickerBtnText}>{formattedDate}</Text>
                    <MaterialCommunityIcons
                        name={showCal ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={COLORS.textMuted}
                    />
                </TouchableOpacity>

                {/* Inline calendar */}
                {showCal && (
                    <CalendarPicker
                        selectedDate={selectedDate}
                        onSelect={d => { setSelectedDate(d); setShowCal(false); }}
                        onClose={() => setShowCal(false)}
                    />
                )}

                {/* Time slot */}
                {selectedDate && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={[Styles.subtitle, { marginBottom: 4 }]}>🕐 Chọn giờ khám *</Text>
                        <TimePicker
                            selectedTime={selectedTime}
                            onSelect={setSelectedTime}
                        />
                    </View>
                )}

                {/* Confirmation chip */}
                {selectedDate && selectedTime && (
                    <View style={[Styles.card, { backgroundColor: COLORS.greenPale, marginBottom: 16 }]}>
                        <Text style={[Styles.text, { color: COLORS.green, fontWeight: "700" }]}>
                            ✅ {formattedDate} lúc {selectedTime}
                        </Text>
                    </View>
                )}

                <TextInput
                    label="Lý do khám *"
                    value={reason}
                    onChangeText={setReason}
                    style={Styles.margin}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    left={<TextInput.Icon icon="stethoscope" />}
                    outlineColor={COLORS.primary}
                    activeOutlineColor={COLORS.primary}
                    placeholder="Mô tả triệu chứng hoặc lý do khám..."
                />

                <TextInput
                    label="Ghi chú thêm"
                    value={notes}
                    onChangeText={setNotes}
                    style={Styles.margin}
                    mode="outlined"
                    multiline
                    numberOfLines={2}
                    left={<TextInput.Icon icon="note-text" />}
                    outlineColor={COLORS.primary}
                    activeOutlineColor={COLORS.primary}
                    placeholder="Dị ứng thuốc, tiền sử bệnh..."
                />

                <Button
                    mode="contained"
                    onPress={book}
                    loading={loading}
                    disabled={loading}
                    buttonColor={COLORS.primary}
                    style={Styles.bookBtn}
                    icon="calendar-check"
                >
                    Xác nhận đặt lịch
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => nav.goBack()}
                    style={{ borderRadius: 8 }}
                    textColor={COLORS.primary}
                >
                    Hủy
                </Button>
            </View>
        </ScrollView>
    );
};

export default BookAppointment;
