import {
    View, ScrollView, TextInput, TouchableOpacity, StatusBar,
    FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";
import { consultationRoomStyles as styles } from "./Styles";

const buildRTMHtml = (appId, token, channel, uid) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head><body>
<script src="https://download.agora.io/sdk/release/AgoraRTM-1.5.1.js"></script>
<script>
const APP_ID="${appId}",TOKEN="${token}",CHANNEL="${channel}",UID="${uid}";
let client=null,ch=null;
const post=d=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(d));
async function init(){
  try{
    if(!window.AgoraRTM){post({type:'ERROR',error:'AgoraRTM SDK not loaded'});return;}
    client=AgoraRTM.createInstance(APP_ID);
    await client.login({uid:UID,token:TOKEN||null});
    ch=client.createChannel(CHANNEL);
    ch.on('ChannelMessage',function(msg,from){
      try{var d=JSON.parse(msg.text);post({type:'MSG',data:d});}
      catch(e){post({type:'MSG',data:{message:msg.text,sender:from,sent_at:new Date().toISOString()}});}
    });
    await ch.join();
    post({type:'READY'});
  }catch(e){post({type:'ERROR',error:e.message});}
}
window.rtmSend=async function(jsonStr){
  try{if(ch)await ch.sendMessage({text:jsonStr});post({type:'SENT'});}
  catch(e){post({type:'SEND_ERROR',error:e.message});}
};
init();
</script></body></html>`;

const STATUS_COLOR = {
    waiting: "#ff9800",
    active: "#4caf50",
    ended: "#9e9e9e",
};
const STATUS_LABEL = {
    waiting: "Chờ kết nối",
    active: "Đang khám",
    ended: "Đã kết thúc",
};

const ConsultationRoom = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const isDoctor = user.role === "doctor";

    const { consultationId } = route.params;

    const [consultation, setConsultation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [entered, setEntered] = useState(false);
    const [message, setMessage] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);
    const [messages, setMessages] = useState([]);
    const [rtmReady, setRtmReady] = useState(false);
    const [rtmConfig, setRtmConfig] = useState(null);

    const flatListRef = useRef(null);
    const pollRef = useRef(null);
    const msgPollRef = useRef(null);
    const rtmRef = useRef(null);
    const seenIdsRef = useRef(new Set());

    const loadConsultation = useCallback(async () => {
        try {
            const res = await authApis(user.token).get(endpoints["consultation-detail"](consultationId));
            const data = res.data;
            setConsultation(data);
            if (data.messages) {
                data.messages.forEach(m => seenIdsRef.current.add(String(m.id)));
                setMessages(data.messages);
            }
            return data;
        } catch (e) {
            console.error("loadConsultation:", e);
        }
    }, [consultationId, user.token]);

    const loadRTMConfig = useCallback(async () => {
        try {
            const res = await authApis(user.token).get(endpoints["consultation-rtm-token"](consultationId));
            setRtmConfig(res.data);
        } catch (e) {
            console.warn("RTM config fetch failed:", e?.message);
        }
    }, [consultationId, user.token]);

    const startPoll = useCallback(() => {
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const res = await authApis(user.token).get(endpoints["consultation-detail"](consultationId));
                setConsultation(res.data);
                if (res.data?.status === "ended") {
                    clearInterval(pollRef.current);
                    clearInterval(msgPollRef.current);
                }
            } catch { }
        }, 5000);

        clearInterval(msgPollRef.current);
        msgPollRef.current = setInterval(async () => {
            try {
                const res = await authApis(user.token).get(endpoints["consultation-detail"](consultationId));
                const incoming = res.data?.messages || [];
                const newMsgs = incoming.filter(m => !seenIdsRef.current.has(String(m.id)));
                if (newMsgs.length > 0) {
                    newMsgs.forEach(m => seenIdsRef.current.add(String(m.id)));
                    setMessages(prev => [...prev, ...newMsgs]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
                }
            } catch { }
        }, 3000);
    }, [consultationId, user.token]);

    useEffect(() => {
        loadConsultation().finally(() => setLoading(false));
        loadRTMConfig();
        startPoll();
        return () => {
            clearInterval(pollRef.current);
            clearInterval(msgPollRef.current);
        };
    }, []);

    const enterRoom = async () => {
        setActionLoading(true);
        try {
            const res = await authApis(user.token).post(endpoints["consultation-enter"](consultationId));
            if (res.data.status === "active") {
                joinVideoCall(res.data);
            } else {
                setEntered(true);
                await loadConsultation();
            }
        } catch (e) {
            Alert.alert("Lỗi", e?.response?.data?.detail || "Không thể vào phòng chờ.");
        } finally {
            setActionLoading(false);
        }
    };

    const joinAsPatient = async () => {
        setActionLoading(true);
        try {
            const res = await authApis(user.token).post(endpoints["consultation-enter"](consultationId));
            if (res.data.agora_token) joinVideoCall(res.data);
        } catch (e) {
            Alert.alert("Lỗi", e?.response?.data?.detail || "Không thể vào phòng khám.");
        } finally {
            setActionLoading(false);
        }
    };

    const startConsultation = async () => {
        setActionLoading(true);
        try {
            const res = await authApis(user.token).post(endpoints["consultation-start"](consultationId));
            joinVideoCall(res.data);
            await loadConsultation();
        } catch (e) {
            Alert.alert("Lỗi", e?.response?.data?.detail || "Không thể bắt đầu khám.");
        } finally {
            setActionLoading(false);
        }
    };

    const endConsultation = () => {
        Alert.alert("Kết thúc khám", "Kết thúc phiên khám này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Kết thúc",
                style: "destructive",
                onPress: async () => {
                    try {
                        await authApis(user.token).post(endpoints["consultation-end"](consultationId));
                        clearInterval(pollRef.current);
                        await loadConsultation();
                    } catch (e) {
                        Alert.alert("Lỗi", e?.response?.data?.detail || "Không thể kết thúc.");
                    }
                },
            },
        ]);
    };

    const joinVideoCall = (data) => {
        nav.navigate("video-call", {
            agoraAppId: data.agora_app_id || "",
            agoraToken: data.agora_token || "",
            channelName: data.channel_name || "",
            uid: data.uid || 0,
            consultationId,
        });
    };

    const handleRTMMessage = useCallback((e) => {
        try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === "READY") {
                setRtmReady(true);
            } else if (msg.type === "ERROR") {
            } else if (msg.type === "MSG" && msg.data) {
                const d = msg.data;
                const id = String(d.id || `rtm_${Date.now()}`);
                if (seenIdsRef.current.has(id)) return;
                seenIdsRef.current.add(id);
                setMessages(prev => [...prev, d]);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
            }
        } catch { }
    }, []);

    const sendMessage = async () => {
        const text = message.trim();
        if (!text) return;
        setSendingMsg(true);
        setMessage("");

        try {
            const res = await authApis(user.token).post(
                endpoints["consultation-messages"](consultationId),
                { message: text }
            );
            const saved = res.data;

            seenIdsRef.current.add(String(saved.id));
            setMessages(prev => [...prev, saved]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

            if (rtmReady && rtmRef.current) {
                const payload = JSON.stringify(saved);
                rtmRef.current.injectJavaScript(`window.rtmSend(${JSON.stringify(payload)}); void(0);`);
            }
        } catch {
            Alert.alert("Lỗi", "Không thể gửi tin nhắn.");
        } finally {
            setSendingMsg(false);
        }
    };

    if (loading) {
        return (
            <View style={[Styles.center, { flex: 1 }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!consultation) {
        return (
            <View style={[Styles.center, { flex: 1 }]}>
                <Text>Không tìm thấy phòng khám.</Text>
            </View>
        );
    }

    const isEnded = consultation.status === "ended";
    const isActive = consultation.status === "active";
    const isWaiting = consultation.status === "waiting";

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <StatusBar backgroundColor={STATUS_COLOR[consultation.status] || "#9e9e9e"} barStyle="light-content" />

            <View style={{ height: 0, overflow: "hidden" }}>
                {rtmConfig && (
                    <WebView
                        ref={rtmRef}
                        source={{ html: buildRTMHtml(rtmConfig.agora_app_id, rtmConfig.rtm_token, rtmConfig.channel_name, rtmConfig.uid) }}
                        style={{ height: 1 }}
                        javaScriptEnabled
                        onMessage={handleRTMMessage}
                    />
                )}
            </View>

            <View style={[styles.statusBar, { backgroundColor: STATUS_COLOR[consultation.status] || "#9e9e9e" }]}>
                <MaterialCommunityIcons
                    name={isActive ? "video" : isEnded ? "check-circle-outline" : "clock-outline"}
                    size={16}
                    color="#fff"
                />
                <Text style={styles.statusText}>{STATUS_LABEL[consultation.status] || consultation.status}</Text>
            </View>

            <ScrollView style={Styles.container} contentContainerStyle={{ paddingBottom: 8 }}>
                <View style={[Styles.card, { margin: 16, marginBottom: 8 }]}>
                    <Text style={Styles.sectionHeader}>Phòng tư vấn</Text>
                    <Text style={Styles.text}>Mã phòng: {consultation.room_id || "—"}</Text>
                    {consultation.started_at && (
                        <Text style={Styles.textSmall}>
                            Bắt đầu: {new Date(consultation.started_at).toLocaleString("vi-VN")}
                        </Text>
                    )}
                </View>

                <View style={[Styles.card, { marginHorizontal: 16, marginBottom: 8 }]}>
                    {!isDoctor && !isEnded && (
                        <>
                            {!entered && !isActive && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                                    onPress={enterRoom}
                                    disabled={actionLoading}
                                >
                                    {actionLoading
                                        ? <ActivityIndicator color="#fff" />
                                        : <>
                                            <MaterialCommunityIcons name="door-open" size={20} color="#fff" />
                                            <Text style={styles.actionBtnText}>Vào phòng chờ</Text>
                                        </>
                                    }
                                </TouchableOpacity>
                            )}

                            {entered && isWaiting && (
                                <View style={styles.waitingBox}>
                                    <ActivityIndicator color={COLORS.primary} />
                                    <Text style={styles.waitingText}>Đang chờ bác sĩ vào phòng...</Text>
                                    <Text style={styles.waitingSubText}>Bác sĩ sẽ bắt đầu sớm</Text>
                                </View>
                            )}

                            {isActive && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: "#2e7d32" }]}
                                    onPress={joinAsPatient}
                                    disabled={actionLoading}
                                >
                                    {actionLoading
                                        ? <ActivityIndicator color="#fff" />
                                        : <>
                                            <MaterialCommunityIcons name="video" size={20} color="#fff" />
                                            <Text style={styles.actionBtnText}>Tham gia video call</Text>
                                        </>
                                    }
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {isDoctor && !isEnded && (
                        <>
                            {isWaiting && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                                    onPress={startConsultation}
                                    disabled={actionLoading}
                                >
                                    {actionLoading
                                        ? <ActivityIndicator color="#fff" />
                                        : <>
                                            <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
                                            <Text style={styles.actionBtnText}>Bắt đầu khám</Text>
                                        </>
                                    }
                                </TouchableOpacity>
                            )}

                            {isActive && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: "#2e7d32" }]}
                                    onPress={startConsultation}
                                    disabled={actionLoading}
                                >
                                    {actionLoading
                                        ? <ActivityIndicator color="#fff" />
                                        : <>
                                            <MaterialCommunityIcons name="video" size={20} color="#fff" />
                                            <Text style={styles.actionBtnText}>Vào video call</Text>
                                        </>
                                    }
                                </TouchableOpacity>
                            )}

                            {!isEnded && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: "#c62828", marginTop: 8 }]}
                                    onPress={endConsultation}
                                >
                                    <MaterialCommunityIcons name="stop-circle" size={20} color="#fff" />
                                    <Text style={styles.actionBtnText}>Kết thúc phiên khám</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {isEnded && (
                        <View style={styles.endedBox}>
                            <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.green} />
                            <Text style={styles.endedText}>Phiên khám đã kết thúc</Text>
                            {consultation.duration_minutes && (
                                <Text style={Styles.textSmall}>
                                    Thời lượng: {consultation.duration_minutes} phút
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                <View style={[Styles.card, { marginHorizontal: 16 }]}>
                    <Text style={[Styles.sectionHeader, { marginBottom: 8 }]}>Tin nhắn</Text>

                    {messages.length === 0 ? (
                        <Text style={[Styles.textSmall, { textAlign: "center", marginVertical: 12 }]}>
                            Chưa có tin nhắn nào
                        </Text>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(m) => String(m.id)}
                            scrollEnabled={false}
                            renderItem={({ item }) => {
                                const isMe = String(item.sender) === String(user.id);
                                return (
                                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                                        {!isMe && (
                                            <Text style={styles.bubbleSender}>{item.sender_name}</Text>
                                        )}
                                        <Text style={[styles.bubbleText, isMe && { color: "#fff" }]}>
                                            {item.message}
                                        </Text>
                                        <Text style={[styles.bubbleTime, isMe && { color: "rgba(255,255,255,0.7)" }]}>
                                            {new Date(item.sent_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                        </Text>
                                    </View>
                                );
                            }}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        />
                    )}
                </View>
            </ScrollView>

            {!isEnded && (
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập tin nhắn..."
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!message.trim() || sendingMsg) && { opacity: 0.4 }]}
                        onPress={sendMessage}
                        disabled={!message.trim() || sendingMsg}
                    >
                        {sendingMsg
                            ? <ActivityIndicator size={20} color="#fff" />
                            : <MaterialCommunityIcons name="send" size={20} color="#fff" />
                        }
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};


export default ConsultationRoom;
