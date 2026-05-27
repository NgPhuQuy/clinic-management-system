import {
    View, ScrollView, TextInput, TouchableOpacity,
    FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { authApis, endpoints } from "../../../configs/Apis";
import { MyUserContext } from "../../../contexts/MyContext";
import Styles, { COLORS } from "../../../styles/Styles";
import styles from "./Styles";

const STATUS_COLOR = {
    waiting: "#ff9800",
    active:  "#4caf50",
    ended:   "#9e9e9e",
};
const STATUS_LABEL = {
    waiting: "Chờ kết nối",
    active:  "Đang khám",
    ended:   "Đã kết thúc",
};

const buildRTMHtml = (appId, rtmToken, channelName, uid) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body>
<script src="https://cdn.jsdelivr.net/npm/agora-rtm-sdk@1/AgoraRTM.js"></script>
<script>
const APP_ID = "${appId}";
const TOKEN  = ${rtmToken ? `"${rtmToken}"` : 'null'};
const CHANNEL = "${channelName}";
const UID = "${uid}";

const post = (data) => {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(data));
};

let rtmClient, rtmChannel;

async function init() {
  if (!APP_ID) { post({type:'RTM_ERROR', error:'No appId'}); return; }
  try {
    rtmClient = AgoraRTM.createInstance(APP_ID, { enableLogUpload: false });
    await rtmClient.login({ uid: UID, token: TOKEN || undefined });

    rtmChannel = rtmClient.createChannel(CHANNEL);
    rtmChannel.on('ChannelMessage', (msg, memberId) => {
      try {
        const data = JSON.parse(msg.text);
        post({ type: 'RTM_MESSAGE', data });
      } catch(e) {}
    });
    await rtmChannel.join();
    post({ type: 'RTM_CONNECTED', channelName: CHANNEL });
  } catch(e) {
    post({ type: 'RTM_ERROR', error: e.message });
  }
}

window.sendRTMMessage = async (payload) => {
  if (!rtmChannel) return;
  try { await rtmChannel.sendMessage({ text: JSON.stringify(payload) }); } catch(e) {}
};

window.cleanupRTM = async () => {
  try {
    if (rtmChannel) await rtmChannel.leave();
    if (rtmClient)  await rtmClient.logout();
  } catch(e) {}
};

init();
</script>
</body>
</html>`;

const ConsultationRoom = () => {
    const nav  = useNavigation();
    const route = useRoute();
    const user  = useContext(MyUserContext);
    const isDoctor = user.role === "doctor";

    const { consultationId } = route.params;

    const [consultation, setConsultation]   = useState(null);
    const [loading, setLoading]             = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [entered, setEntered]             = useState(false);
    const [message, setMessage]             = useState("");
    const [sendingMsg, setSendingMsg]       = useState(false);
    const [messages, setMessages]           = useState([]);
    const [rtmConfig, setRtmConfig]         = useState(null);
    const [rtmReady, setRtmReady]           = useState(false);

    const flatListRef = useRef(null);
    const rtmRef      = useRef(null);
    const statusPollRef = useRef(null);

    const loadConsultation = useCallback(async () => {
        try {
            const res = await authApis(user.token).get(endpoints["consultation-detail"](consultationId));
            setConsultation(res.data);
            if (res.data.messages?.length > 0) {
                setMessages(res.data.messages);
            }
            return res.data;
        } catch (e) {
            console.error("loadConsultation:", e);
        }
    }, [consultationId, user.token]);

    const fetchRTMConfig = useCallback(async () => {
        try {
            const res = await authApis(user.token).get(endpoints["consultation-rtm-token"](consultationId));
            setRtmConfig(res.data);
        } catch (e) {
            console.error("fetchRTMConfig:", e);
        }
    }, [consultationId, user.token]);

    useEffect(() => {
        Promise.all([loadConsultation(), fetchRTMConfig()])
            .finally(() => setLoading(false));
        return () => {
            clearInterval(statusPollRef.current);
            rtmRef.current?.injectJavaScript("window.cleanupRTM(); true;");
        };
    }, []);

    useEffect(() => {
        if (!consultation || consultation.status !== "waiting") {
            clearInterval(statusPollRef.current);
            return;
        }
        statusPollRef.current = setInterval(async () => {
            const updated = await loadConsultation();
            if (!isDoctor && updated?.status === "active" && entered) {
                clearInterval(statusPollRef.current);
            }
        }, 5000);
        return () => clearInterval(statusPollRef.current);
    }, [consultation?.status, entered]);

    const onRTMMessage = useCallback((e) => {
        try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === "RTM_CONNECTED") {
                setRtmReady(true);
            } else if (msg.type === "RTM_MESSAGE") {
                const incoming = msg.data;
                if (String(incoming.sender) !== String(user.id)) {
                    setMessages(prev => {
                        const alreadyExists = prev.some(m => m.id === incoming.id);
                        if (alreadyExists) return prev;
                        return [...prev, { ...incoming, id: incoming.id || `rtm_${Date.now()}` }];
                    });
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
            } else if (msg.type === "RTM_ERROR") {
                console.warn("RTM Error:", msg.error);
            }
        } catch {}
    }, [user.id]);

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
            agoraAppId:    data.agora_app_id  || "",
            agoraToken:    data.agora_token   || "",
            channelName:   data.channel_name  || "",
            uid:           data.uid           || 0,
            consultationId,
        });
    };

    const sendMessage = async () => {
        const text = message.trim();
        if (!text) return;
        setSendingMsg(true);

        const tempId = `local_${Date.now()}`;
        const senderName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
        const now = new Date().toISOString();

        const optimistic = {
            id: tempId,
            message: text,
            sender: user.id,
            sender_name: senderName,
            sent_at: now,
        };
        setMessages(prev => [...prev, optimistic]);
        setMessage("");
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            const res = await authApis(user.token).post(
                endpoints["consultation-messages"](consultationId),
                { message: text }
            );

            const saved = res.data;
            setMessages(prev => prev.map(m => m.id === tempId ? saved : m));

            if (rtmReady && rtmRef.current) {
                const rtmPayload = {
                    id:          saved.id,
                    message:     saved.message,
                    sender:      saved.sender,
                    sender_name: saved.sender_name,
                    sent_at:     saved.sent_at,
                };
                rtmRef.current.injectJavaScript(
                    `window.sendRTMMessage(${JSON.stringify(rtmPayload)}); true;`
                );
            }
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
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

    const isEnded   = consultation.status === "ended";
    const isActive  = consultation.status === "active";
    const isWaiting = consultation.status === "waiting";

    const rtmHtml = rtmConfig
        ? buildRTMHtml(
            rtmConfig.agora_app_id || consultation.agora_app_id || "",
            rtmConfig.rtm_token,
            rtmConfig.channel_name || consultation.room_id,
            String(user.id),
          )
        : null;

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

            {rtmHtml && !isEnded && (
                <WebView
                    ref={rtmRef}
                    source={{ html: rtmHtml }}
                    style={styles.hiddenWebView}
                    javaScriptEnabled
                    onMessage={onRTMMessage}
                    originWhitelist={["*"]}
                />
            )}

            <View style={[styles.statusBar, { backgroundColor: STATUS_COLOR[consultation.status] || "#9e9e9e" }]}>
                <MaterialCommunityIcons
                    name={isActive ? "video" : isEnded ? "check-circle-outline" : "clock-outline"}
                    size={16}
                    color="#fff"
                />
                <Text style={styles.statusText}>{STATUS_LABEL[consultation.status] || consultation.status}</Text>
                {rtmReady && !isEnded && (
                    <View style={styles.rtmDot} />
                )}
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
                    <View style={styles.chatHeader}>
                        <Text style={Styles.sectionHeader}>Tin nhắn</Text>
                        {!isEnded && (
                            <View style={[styles.rtmStatus, { backgroundColor: rtmReady ? "#e8f5e9" : "#fff3e0" }]}>
                                <View style={[styles.rtmStatusDot, { backgroundColor: rtmReady ? "#4caf50" : "#ff9800" }]} />
                                <Text style={[styles.rtmStatusText, { color: rtmReady ? "#2e7d32" : "#e65100" }]}>
                                    {rtmReady ? "Real-time" : "Đang kết nối..."}
                                </Text>
                            </View>
                        )}
                    </View>

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
