import { View, ScrollView, Image, TouchableOpacity, useWindowDimensions } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useState, useContext, useEffect, useRef } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";
import { DatePickerField, TimePickerField } from "../../components/DatePickerField";
import { bookAppointmentStyles as styles } from "./Styles";

const HOLD_MINUTES = 10;

const DoctorAvatar = ({ uri, size = 52 }) => {
    const [err, setErr] = useState(false);
    if (uri && !err) return (
        <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            onError={() => setErr(true)}
        />
    );
    return (
        <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: COLORS.primaryPale,
            alignItems: "center", justifyContent: "center",
        }}>
            <MaterialCommunityIcons name="doctor" size={size * 0.52} color={COLORS.primary} />
        </View>
    );
};

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = [
    "Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
    "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12",
];
const TIME_SLOTS = [
    "07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00",
    "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30",
];

const CalendarPicker = ({ selectedDate, onSelect, onClose }) => {
    const { width: SCREEN_W } = useWindowDimensions();
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

            <View style={{ flexDirection: "row" }}>
                {DAY_NAMES.map(d => (
                    <Text key={d} style={[Styles.calendarDayName, { width: DAY_SIZE }]}>{d}</Text>
                ))}
            </View>

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

const BookAppointment = () => {
    const nav    = useNavigation();
    const route  = useRoute();
    const user   = useContext(MyUserContext);
    const { doctorId, scheduleId, doctorName, schedule } = route.params || {};

    const doctorAvatar = schedule?.doctorAvatar || route.params?.doctorAvatar || null;

    const [form, setForm] = useState({
        reason: "",
        notes: "",
        appointment_date: schedule ? `${schedule.date}T${schedule.start_time}` : "",
    });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    const startTime = useRef(Date.now());
    const [secondsLeft, setSecondsLeft] = useState(HOLD_MINUTES * 60);
    const expired = secondsLeft <= 0;

    useEffect(() => {
        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
            const left = HOLD_MINUTES * 60 - elapsed;
            setSecondsLeft(left > 0 ? left : 0);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatCountdown = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, "0")}`;
    };

    const validate = () => {
        if (!doctorId) { setErr("Vui lòng chọn bác sĩ trước khi đặt lịch!"); return false; }
        if (!form.appointment_date) { setErr("Vui lòng nhập ngày giờ khám!"); return false; }
        if (!form.reason.trim()) { setErr("Vui lòng nhập lý do khám!"); return false; }
        if (expired) { setErr("Phiên đặt lịch đã hết hạn. Vui lòng chọn lại ca khám."); return false; }
        return true;
    };

    const book = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            setErr(null);
            const payload = {
                doctor:           doctorId,
                appointment_date: form.appointment_date,
                reason:           form.reason,
                notes:            form.notes,
            };
            if (scheduleId) payload.schedule = scheduleId;

            const res = await authApis(user.token).post(endpoints["appointments"], payload);
            if (res.status === 201) {
                const appt = res.data;
                nav.navigate("payment-screen", {
                    invoiceId: appt.invoice?.id,
                    appointmentId: appt.id,
                    doctorName,
                    appointmentDate: appt.appointment_date,
                    amount: appt.invoice?.total_amount_amount ?? appt.invoice?.remaining ?? 0,
                    fromBooking: true,
                });
            }
        } catch (ex) {
            console.error("book error:", ex?.response?.data ?? ex);
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
        <ScrollView style={Styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={[Styles.padding, styles.form]}>

                <View style={styles.doctorCard}>
                    <DoctorAvatar uri={doctorAvatar} size={54} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.doctorName}>BS. {doctorName}</Text>
                        {schedule && (
                            <>
                                <View style={styles.infoLine}>
                                    <MaterialCommunityIcons name="calendar" size={13} color={COLORS.primary} />
                                    <Text style={styles.infoText}>
                                        {" "}{new Date(schedule.date + "T00:00:00").toLocaleDateString("vi-VN", {
                                            weekday: "short", day: "numeric", month: "numeric", year: "numeric"
                                        })}
                                    </Text>
                                </View>
                                <View style={styles.infoLine}>
                                    <MaterialCommunityIcons name="clock-outline" size={13} color={COLORS.primary} />
                                    <Text style={styles.infoText}>
                                        {" "}{schedule.start_time} – {schedule.end_time}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                <View style={[styles.countdown, expired && styles.countdownExpired]}>
                    <MaterialCommunityIcons
                        name={expired ? "clock-alert-outline" : "timer-sand"}
                        size={18}
                        color={expired ? COLORS.red : secondsLeft < 120 ? COLORS.orange : COLORS.primary}
                    />
                    <Text style={[
                        styles.countdownText,
                        expired && { color: COLORS.red },
                        !expired && secondsLeft < 120 && { color: COLORS.orange },
                    ]}>
                        {expired
                            ? " Phiên đặt lịch đã hết hạn"
                            : ` Giữ chỗ còn lại: ${formatCountdown(secondsLeft)}`}
                    </Text>
                </View>

                <HelperText type="error" visible={!!err}>{err}</HelperText>

                {!schedule && (
                    <View style={{ gap: 2 }}>
                        <DatePickerField
                            label="Ngày khám *"
                            value={form.appointment_date.split("T")[0] || ""}
                            onChange={(d) => setForm({ ...form, appointment_date: `${d}T${form.appointment_date.split("T")[1] || "08:00"}` })}
                        />
                        <TimePickerField
                            label="Giờ khám *"
                            value={form.appointment_date.split("T")[1]?.slice(0,5) || ""}
                            onChange={(t) => setForm({ ...form, appointment_date: `${form.appointment_date.split("T")[0] || ""}T${t}` })}
                        />
                    </View>
                )}

                <TextInput
                    label="Lý do khám *"
                    value={form.reason}
                    onChangeText={(t) => setForm({ ...form, reason: t })}
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
                    value={form.notes}
                    onChangeText={(t) => setForm({ ...form, notes: t })}
                    style={Styles.margin}
                    mode="outlined"
                    multiline
                    numberOfLines={2}
                    left={<TextInput.Icon icon="note-text-outline" />}
                    outlineColor={COLORS.primary}
                    activeOutlineColor={COLORS.primary}
                    placeholder="Dị ứng thuốc, tiền sử bệnh..."
                />

                <TouchableOpacity
                    style={[styles.confirmBtn, (loading || expired) && { opacity: 0.55 }]}
                    onPress={book}
                    disabled={loading || expired}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
                    <Text style={styles.confirmBtnText}>
                        {loading ? "Đang đặt lịch..." : "Xác nhận đặt lịch"}
                    </Text>
                </TouchableOpacity>

                <Button
                    mode="outlined"
                    onPress={() => nav.goBack()}
                    style={{ borderRadius: 10 }}
                    textColor={COLORS.primary}
                >
                    Quay lại
                </Button>
            </View>
        </ScrollView>
    );
};


export default BookAppointment;
