import { View, TouchableOpacity, useWindowDimensions, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../styles/Styles";

const DAY_NAMES = ["CN","T2","T3","T4","T5","T6","T7"];
const MONTH_VI  = ["Th.1","Th.2","Th.3","Th.4","Th.5","Th.6","Th.7","Th.8","Th.9","Th.10","Th.11","Th.12"];

export const DatePickerField = ({ value, onChange, label = "Ngày", clearLabel = "Xóa ngày" }) => {
    const { width } = useWindowDimensions();
    const [open, setOpen] = useState(false);
    const today = new Date(); today.setHours(0,0,0,0);

    const parsed = value ? new Date(value + "T00:00:00") : null;
    const [vY, setVY] = useState(() => parsed ? parsed.getFullYear()  : today.getFullYear());
    const [vM, setVM] = useState(() => parsed ? parsed.getMonth()     : today.getMonth());

    const DAY_SZ = Math.floor((width - 80) / 7);
    const first  = new Date(vY, vM, 1).getDay();
    const days   = new Date(vY, vM + 1, 0).getDate();
    const cells  = [...Array(first).fill(null), ...Array.from({length: days}, (_, i) => i + 1)];

    const select = (d) => {
        const mm = String(vM + 1).padStart(2, "0");
        const dd = String(d).padStart(2, "0");
        onChange(`${vY}-${mm}-${dd}`);
        setOpen(false);
    };
    const prevM = () => { if (vM === 0) { setVM(11); setVY(y => y - 1); } else setVM(m => m - 1); };
    const nextM = () => { if (vM === 11) { setVM(0);  setVY(y => y + 1); } else setVM(m => m + 1); };

    const displayText = parsed
        ? parsed.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" })
        : "";

    return (
        <View style={{ marginBottom: 10 }}>
            <TouchableOpacity style={S.field} onPress={() => setOpen(o => !o)} activeOpacity={0.75}>
                <Text style={[S.fieldLabel, (open || value) && { color: COLORS.primary, fontSize: 12, top: -8 }]}>
                    {label}
                </Text>
                <Text style={[S.fieldValue, !value && { color: COLORS.textLight }]}>
                    {displayText || "Chưa chọn"}
                </Text>
                <MaterialCommunityIcons
                    name={open ? "calendar-remove" : "calendar"}
                    size={20}
                    color={open ? COLORS.primary : COLORS.textMuted}
                />
            </TouchableOpacity>

            {open && (
                <View style={S.calWrap}>
                    <View style={S.calHeader}>
                        <TouchableOpacity onPress={prevM} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                            <MaterialCommunityIcons name="chevron-left" size={22} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={S.calMonthTxt}>{MONTH_VI[vM]} {vY}</Text>
                        <TouchableOpacity onPress={nextM} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                            <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection:"row" }}>
                        {DAY_NAMES.map(d => (
                            <Text key={d} style={[S.dayName, { width: DAY_SZ }]}>{d}</Text>
                        ))}
                    </View>
                    <View style={{ flexDirection:"row", flexWrap:"wrap" }}>
                        {cells.map((day, idx) => {
                            if (!day) return <View key={`e${idx}`} style={{ width: DAY_SZ, height: DAY_SZ }} />;
                            const cellDate = new Date(vY, vM, day);
                            const isSel = parsed &&
                                cellDate.getFullYear() === parsed.getFullYear() &&
                                cellDate.getMonth()    === parsed.getMonth()    &&
                                cellDate.getDate()     === parsed.getDate();
                            const isToday = cellDate.getTime() === today.getTime();
                            return (
                                <TouchableOpacity
                                    key={day}
                                    onPress={() => select(day)}
                                    style={[
                                        S.dayCell,
                                        { width: DAY_SZ, height: DAY_SZ },
                                        isToday && S.dayCellToday,
                                        isSel   && S.dayCellSel,
                                    ]}
                                >
                                    <Text style={[S.dayText, isSel && { color:"#fff", fontWeight:"700" }]}>
                                        {day}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {value ? (
                        <TouchableOpacity style={S.clearBtn} onPress={() => { onChange(""); setOpen(false); }}>
                            <Text style={S.clearBtnText}>{clearLabel}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            )}
        </View>
    );
};

const S = StyleSheet.create({
    field: {
        flexDirection: "row", alignItems: "center",
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8,
        paddingHorizontal: 14, paddingVertical: 12,
        backgroundColor: "#fff", gap: 8,
    },
    fieldLabel: {
        position: "absolute", top: 14, left: 14,
        fontSize: 14, color: COLORS.textMuted,
        backgroundColor: "#fff", paddingHorizontal: 4,
    },
    fieldValue:    { flex: 1, fontSize: 14, color: COLORS.text, paddingTop: 6 },
    calWrap:       { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginTop: 4, elevation: 4 },
    calHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    calMonthTxt:   { fontSize: 14, fontWeight: "700", color: COLORS.text },
    dayName:       { textAlign: "center", fontSize: 11, fontWeight: "600", color: COLORS.textMuted, paddingVertical: 4 },
    dayCell:       { alignItems: "center", justifyContent: "center", borderRadius: 4 },
    dayCellToday:  { backgroundColor: COLORS.primaryPale },
    dayCellSel:    { backgroundColor: COLORS.primary, borderRadius: 6 },
    dayText:       { fontSize: 13, color: COLORS.text },
    clearBtn:      { marginTop: 8, alignItems: "center", paddingVertical: 6 },
    clearBtnText:  { fontSize: 12, color: COLORS.red, fontWeight: "600" },
    timeSection:   { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 },
    timeGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    timeCell:      { minWidth: 38, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8, backgroundColor: COLORS.bg, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
    timeCellWide:  { minWidth: 56 },
    timeCellSel:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    timeCellTxt:   { fontSize: 13, color: COLORS.text },
});

const HOURS   = Array.from({length: 24}, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "10", "15", "20", "30", "40", "45", "50"];

export const TimePickerField = ({ value, onChange, label = "Giờ" }) => {
    const [open, setOpen] = useState(false);
    const normalized = value ? value.slice(0, 5) : "";
    const [curH, curM] = normalized ? normalized.split(":") : ["", ""];

    const pick = (h, m) => { onChange(`${h}:${m}`); setOpen(false); };

    return (
        <View style={{ marginBottom: 10 }}>
            <TouchableOpacity style={S.field} onPress={() => setOpen(o => !o)} activeOpacity={0.75}>
                <Text style={[S.fieldLabel, (open || value) && { color: COLORS.primary, fontSize: 12, top: -8 }]}>
                    {label}
                </Text>
                <Text style={[S.fieldValue, !value && { color: COLORS.textLight }]}>
                    {normalized || "Chưa chọn"}
                </Text>
                <MaterialCommunityIcons
                    name="clock-outline"
                    size={20}
                    color={open ? COLORS.primary : COLORS.textMuted}
                />
            </TouchableOpacity>

            {open && (
                <View style={S.calWrap}>
                    <Text style={S.timeSection}>Giờ</Text>
                    <View style={S.timeGrid}>
                        {HOURS.map(h => (
                            <TouchableOpacity
                                key={h}
                                onPress={() => pick(h, curM || "00")}
                                style={[S.timeCell, curH === h && S.timeCellSel]}
                            >
                                <Text style={[S.timeCellTxt, curH === h && { color:"#fff", fontWeight:"700" }]}>{h}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={[S.timeSection, { marginTop: 8 }]}>Phút</Text>
                    <View style={S.timeGrid}>
                        {MINUTES.map(m => (
                            <TouchableOpacity
                                key={m}
                                onPress={() => pick(curH || "08", m)}
                                style={[S.timeCell, S.timeCellWide, curM === m && S.timeCellSel]}
                            >
                                <Text style={[S.timeCellTxt, curM === m && { color:"#fff", fontWeight:"700" }]}>:{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
};

