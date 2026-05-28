import { View, StyleSheet, Alert, StatusBar, PermissionsAndroid, Platform } from "react-native";
import { Text } from "react-native-paper";
import { useRef, useContext, useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { MyUserContext } from "../../contexts/MyContext";

const buildHtml = (appId, token, channel, uid) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <title>Video Call</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#111827;font-family:sans-serif;overflow:hidden}
    #app{display:flex;flex-direction:column;height:100%}
    #info{background:#1565c0;color:#fff;text-align:center;padding:10px 16px;font-size:13px;font-weight:600}
    #remote-wrap{flex:1;position:relative;background:#1e293b;display:flex;align-items:center;justify-content:center}
    #remote-player{width:100%;height:100%}
    #wait-msg{color:#94a3b8;font-size:14px;position:absolute}
    #local-wrap{position:absolute;bottom:96px;right:12px;width:108px;height:148px;border-radius:14px;overflow:hidden;border:2.5px solid #fff;z-index:10;background:#0f172a}
    #controls{display:flex;justify-content:center;align-items:center;gap:20px;padding:14px 20px 22px;background:#1e293b}
    .btn{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
    .btn .material-icons{font-size:26px;color:#fff}
    #btn-end{background:#dc2626}
    #btn-end .material-icons{font-size:28px}
    #btn-mic,#btn-cam{background:#374151}
    .btn.muted{background:#7f1d1d}
    .btn-label{color:#94a3b8;font-size:10px;text-align:center;margin-top:5px}
    .btn-wrap{display:flex;flex-direction:column;align-items:center}
  </style>
</head>
<body>
<div id="app">
  <div id="info">Đang kết nối phòng khám...</div>
  <div id="remote-wrap">
    <div id="remote-player"></div>
    <span id="wait-msg">Đang chờ kết nối...</span>
    <div id="local-wrap"><div id="local-player" style="width:100%;height:100%"></div></div>
  </div>
  <div id="controls">
    <div class="btn-wrap">
      <button class="btn" id="btn-mic"><span class="material-icons">mic</span></button>
      <span class="btn-label">Micro</span>
    </div>
    <div class="btn-wrap">
      <button class="btn" id="btn-end"><span class="material-icons">call_end</span></button>
      <span class="btn-label">Rời gọi</span>
    </div>
    <div class="btn-wrap">
      <button class="btn" id="btn-cam"><span class="material-icons">videocam</span></button>
      <span class="btn-label">Camera</span>
    </div>
  </div>
</div>
<script src="https://download.agora.io/sdk/release/AgoraRTC_N.js"></script>
<script>
const APP_ID="${appId}", TOKEN="${token}", CHANNEL="${channel}", UID=${uid};
let client,audioTrack,videoTrack,micMuted=false,camMuted=false;
const $=id=>document.getElementById(id);
const info=msg=>$('info').textContent=msg;

if(!navigator.mediaDevices) navigator.mediaDevices={};
if(!navigator.mediaDevices.getUserMedia){
  const legacy=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia;
  if(legacy) navigator.mediaDevices.getUserMedia=legacy.bind(navigator);
}

async function init(){
  if(!APP_ID||APP_ID==='undefined'){info('Agora chưa được cấu hình');return;}
  try{
    // Test getUserMedia trước
    const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    stream.getTracks().forEach(t=>t.stop());
  }catch(e){
    info('Lỗi quyền camera/mic: '+e.name);
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'PERM_ERROR',error:e.name}));
    return;
  }
  try{
    client=AgoraRTC.createClient({mode:'rtc',codec:'vp8'});
    client.on('user-published',async(user,type)=>{
      await client.subscribe(user,type);
      if(type==='video'){$('wait-msg').style.display='none';user.videoTrack.play('remote-player');}
      if(type==='audio') user.audioTrack.play();
    });
    client.on('user-left',()=>{
      $('remote-player').innerHTML='';
      $('wait-msg').style.display='';
      $('wait-msg').textContent='Người kia đã rời cuộc gọi';
    });
    info('Đang vào phòng...');
    await client.join(APP_ID,CHANNEL,TOKEN||null,UID||null);
    [audioTrack,videoTrack]=await AgoraRTC.createMicrophoneAndCameraTracks();
    videoTrack.play('local-player');
    await client.publish([audioTrack,videoTrack]);
    info('Đang khám — '+CHANNEL);
  }catch(e){info('Lỗi: '+e.message);}
}

$('btn-mic').onclick=async()=>{
  micMuted=!micMuted;
  if(audioTrack) await audioTrack.setMuted(micMuted);
  $('btn-mic').innerHTML='<span class="material-icons">'+(micMuted?'mic_off':'mic')+'</span>';
  $('btn-mic').classList.toggle('muted',micMuted);
};
$('btn-cam').onclick=async()=>{
  camMuted=!camMuted;
  if(videoTrack) await videoTrack.setMuted(camMuted);
  $('btn-cam').innerHTML='<span class="material-icons">'+(camMuted?'videocam_off':'videocam')+'</span>';
  $('btn-cam').classList.toggle('muted',camMuted);
};
$('btn-end').onclick=async()=>{
  try{if(audioTrack){audioTrack.stop();audioTrack.close();}
      if(videoTrack){videoTrack.stop();videoTrack.close();}
      if(client) await client.leave();}catch(e){}
  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'END_CALL'}));
};
init();
</script>
</body>
</html>`;

const VideoCallScreen = () => {
    const nav = useNavigation();
    const route = useRoute();
    const user = useContext(MyUserContext);
    const webviewRef = useRef(null);
    const [permissionsGranted, setPermissionsGranted] = useState(Platform.OS !== "android");

    const {
        agoraAppId = "",
        agoraToken = "",
        channelName = "",
        uid = 0,
        consultationId,
    } = route.params || {};

    useEffect(() => {
        if (Platform.OS !== "android") return;
        (async () => {
            try {
                const results = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);
                const granted =
                    results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
                    results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
                setPermissionsGranted(granted);
                if (!granted) Alert.alert("Cần quyền truy cập", "Ứng dụng cần quyền camera và microphone để thực hiện video call.");
            } catch {
                setPermissionsGranted(true);
            }
        })();
    }, []);

    const html = buildHtml(agoraAppId, agoraToken, channelName, uid);

    const handleMessage = (e) => {
        try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === "END_CALL") {
                nav.goBack();
            } else if (msg.type === "PERM_ERROR") {
                Alert.alert("Lỗi camera/micro", `Không thể truy cập camera/micro: ${msg.error}.\nVui lòng kiểm tra lại quyền trong Settings.`);
            }
        } catch {}
    };

    if (!permissionsGranted) {
        return (
            <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
                <StatusBar barStyle="light-content" backgroundColor="#111827" />
                <Text style={{ color: "#fff", fontSize: 15, textAlign: "center", paddingHorizontal: 32 }}>
                    Cần cấp quyền camera và microphone để thực hiện video call.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#111827" />
            <WebView
                ref={webviewRef}
                source={{ html, baseUrl: "http://localhost" }}
                style={styles.webview}
                originWhitelist={["*"]}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                allowFileAccess
                allowFileAccessFromFileURLs
                allowUniversalAccessFromFileURLs
                mixedContentMode="always"
                onMessage={handleMessage}
                onPermissionRequest={(e) => e.nativeEvent.request.grant(e.nativeEvent.request.resources)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#111827" },
    webview: { flex: 1 },
});

export default VideoCallScreen;
