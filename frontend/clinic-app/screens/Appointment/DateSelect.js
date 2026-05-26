import {
    View, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Dimensions,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect, useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import { COLORS } from "../../styles/Styles";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
// MM-DD fixed holidays
const FIXED_HOLIDAYS = new Set(["01-01", "04-30", "05-01", "09-02"]);

const toDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const isHoliday = (year, month, day) => {
    const key = `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return FIXED_HOLIDAYS.has(key);
};

const CELL_SIZE = Math.floor((Dimensions.get("window").width - 32 - 24) / 7);

const DateSelect = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const { specialtyId, specialtyName } = route.params;

    const today = new Date();
    const todayStr = toDateStr(today);

    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [availableDates, setAvailableDates] = useState(new Set());
    const [allSchedules, setAllSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        try {
            setLoading(true);
            const doctorsRes = await authApis(user.token).get(
                `${endpoints["doctors"]}?specialty=${specialtyId}&page_size=50`
            );
            const doctors = doctorsRes.data.results || doctorsRes.data;

            const scheduleResults = await Promise.all(
                doctors.map(doc =>
                    authApis(user.token)
                        .get(endpoints["doctor-schedules"](doc.id))
                        .then(r =>
                            (r.data.results || r.data).map(s => ({
                                ...s,
                                doctorId: doc.id,
                                doctorName: doc.full_name,
                                doctorAvatar: doc.avatar || doc.avatar_url,
                            }))
                        )
                        .catch(() => [])
                )
            );

            const merged = scheduleResults.flat();
            const dates = new Set(
                merged.filter(s => s.date > todayStr).map(s => s.date)
            );

            setAllSchedules(merged);
            setAvailableDates(dates);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const handleDayPress = (dateStr) => {
        if (!availableDates.has(dateStr)) return;
        setSelectedDate(dateStr);
        const daySchedules = allSchedules.filter(s => s.date === dateStr);
        nav.navigate("slot-select", {
            date: dateStr,
            schedules: daySchedules,
            specialtyName,
        });
    };

    const renderCalendar = () => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const cells = [];

        for (let i = 0; i < firstDay; i++) {
            cells.push(<View key={`e${i}`} style={styles.dayCell} />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isPast = dateStr <= todayStr;
            const holiday = isHoliday(viewYear, viewMonth, d);
            const isAvail = availableDates.has(dateStr) && !holiday;
            const isSelected = dateStr === selectedDate;

            cells.push(
                <TouchableOpacity
                    key={dateStr}
                    style={[
                        styles.dayCell,
                        isToday && styles.dayCellToday,
                        isAvail && !isSelected && styles.dayCellAvail,
                        isSelected && styles.dayCellSelected,
                        holiday && !isToday && styles.dayCellHoliday,
                    ]}
                    onPress={() => handleDayPress(dateStr)}
                    disabled={!isAvail || isPast}
                    activeOpacity={0.7}
                >
                    <Text style={[
                        styles.dayText,
                        isPast && !isToday && styles.dayTextPast,
                        isAvail && styles.dayTextAvail,
                        isSelected && styles.dayTextSelected,
                        isToday && !isAvail && styles.dayTextToday,
                    ]}>
                        {d}
                    </Text>
                    {isToday && (
                        <Text style={[styles.subLabel, isAvail ? styles.subLabelWhite : styles.subLabelBlue]}>
                            Hôm nay
                        </Text>
                    )}
                    {holiday && !isToday && (
                        <Text style={styles.subLabelOrange}>Ngày lễ</Text>
                    )}
                </TouchableOpacity>
            );
        }
        return cells;
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <ScrollView>
                <View style={styles.calCard}>
                    {/* Month navigation */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
                            <MaterialCommunityIcons name="chevron-left" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.monthTitle}>
                            Tháng {String(viewMonth + 1).padStart(2, "0")} - {viewYear}
                        </Text>
                        <TouchableOpacity style={[styles.navBtn, styles.navBtnActive]} onPress={nextMonth}>
                            <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Weekday headers */}
                    <View style={styles.weekRow}>
                        {WEEKDAYS.map((d, i) => (
                            <Text key={d} style={[styles.weekDay, i === 0 && styles.weekDaySun]}>
                                {d}
                            </Text>
                        ))}
                    </View>

                    {/* Days grid */}
                    {loading ? (
                        <View style={{ paddingVertical: 48, alignItems: "center" }}>
                            <ActivityIndicator color={COLORS.primary} />
                            <Text style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 12 }}>
                                Đang tải lịch có sẵn...
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.daysGrid}>
                            {renderCalendar()}
                        </View>
                    )}
                </View>

                {/* Legend */}
                {!loading && (
                    <View style={styles.legendCard}>
                        <View style={styles.hintBorder}>
                            <Text style={styles.hintText}>
                                Chọn ngày có{" "}
                                <Text style={{ color: COLORS.primary, fontWeight: "700" }}>màu xanh dương</Text>
                                {" "}để đặt khám.
                            </Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: COLORS.primary }]} />
                                <Text style={styles.legendText}>Ngày có thể chọn khám</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: "#e0e0e0" }]} />
                                <Text style={styles.legendText}>Ngày không chọn khám</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: "#fff", borderWidth: 2, borderColor: COLORS.orange }]} />
                                <Text style={styles.legendText}>Ngày Lễ, Tết</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    calCard: {
        margin: 16,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 12,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    monthNav: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    navBtn: {
        width: 36, height: 36,
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
        alignItems: "center", justifyContent: "center",
    },
    navBtnActive: {
        backgroundColor: COLORS.primary,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: COLORS.primary,
    },
    weekRow: {
        flexDirection: "row",
        marginBottom: 4,
    },
    weekDay: {
        width: CELL_SIZE,
        textAlign: "center",
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.textMuted,
        paddingVertical: 4,
    },
    weekDaySun: {
        color: COLORS.red,
    },
    daysGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    dayCell: {
        width: CELL_SIZE,
        minHeight: CELL_SIZE,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        marginVertical: 2,
        paddingVertical: 4,
    },
    dayCellToday: {
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    dayCellAvail: {
        backgroundColor: COLORS.primary,
    },
    dayCellSelected: {
        backgroundColor: COLORS.primaryDark,
    },
    dayCellHoliday: {
        borderWidth: 2,
        borderColor: COLORS.orange,
    },
    dayText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
    },
    dayTextPast: {
        color: COLORS.textLight,
        fontWeight: "400",
    },
    dayTextAvail: {
        color: "#fff",
        fontWeight: "700",
    },
    dayTextSelected: {
        color: "#fff",
        fontWeight: "800",
    },
    dayTextToday: {
        color: COLORS.primary,
        fontWeight: "800",
    },
    subLabel: {
        fontSize: 8,
        fontWeight: "600",
    },
    subLabelWhite: { color: "#fff" },
    subLabelBlue:  { color: COLORS.primary },
    subLabelOrange: { fontSize: 8, fontWeight: "600", color: COLORS.orange },
    legendCard: {
        marginHorizontal: 16,
        marginBottom: 24,
    },
    hintBorder: {
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
        paddingLeft: 10,
        paddingVertical: 6,
        marginBottom: 14,
    },
    hintText: {
        fontSize: 13,
        color: COLORS.text,
    },
    legendRow: {
        gap: 6,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    legendBox: {
        width: 20, height: 20,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
});

export default DateSelect;
