import logging
import time
from datetime import timedelta

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..models import Consultation, Notification, ChatMessage
from ..permissions import (
    IsAuthenticatedWithValidToken,
    HasDoctorOrAdminScope,
    HasPatientScope,
)
from ..serializers import ConsultationSerializer, ChatMessageSerializer
from ..utils import get_token_scopes

logger = logging.getLogger(__name__)


def _generate_agora_token(channel_name: str, uid: int) -> str:
    try:
        from agora_token_builder import RtcTokenBuilder
        return RtcTokenBuilder.buildTokenWithUid(
            settings.AGORA_APP_ID,
            settings.AGORA_APP_CERTIFICATE,
            channel_name,
            uid,
            1,
            int(time.time()) + settings.AGORA_TOKEN_EXPIRY,
        )
    except Exception as e:
        logger.error(f"Agora token generation failed: {e}")
        return ""


def _generate_agora_rtm_token(user_id: str) -> str:
    try:
        from agora_token_builder import RtmTokenBuilder
        return RtmTokenBuilder.buildToken(
            settings.AGORA_APP_ID,
            settings.AGORA_APP_CERTIFICATE,
            user_id,
            int(time.time()) + settings.AGORA_TOKEN_EXPIRY,
        )
    except Exception as e:
        logger.warning(f"RTM token generation failed: {e}")
        return ""


class ConsultationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Consultation.objects.select_related(
        "appointment__patient__user",
        "appointment__doctor__user",
    )
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticatedWithValidToken]

    def get_queryset(self):
        user   = self.request.user
        qs     = super().get_queryset()
        scopes = get_token_scopes(self.request)

        if "admin"   in scopes: return qs
        if "doctor"  in scopes: return qs.filter(appointment__doctor__user=user)
        if "patient" in scopes: return qs.filter(appointment__patient__user=user)
        return qs.none()

    @action(detail=True, methods=["post"], permission_classes=[HasPatientScope], url_path="enter")
    def enter(self, request, pk=None):
        consultation = self.get_object()

        if consultation.appointment.patient.user != request.user:
            return Response(
                {"detail": "Bạn không phải bệnh nhân của lịch hẹn này."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment_time = consultation.appointment.appointment_date
        now = timezone.now()
        appt_date_local = timezone.localtime(appointment_time).date()
        today_local = timezone.localdate()

        if appt_date_local < today_local:
            return Response(
                {"detail": "Lịch hẹn đã qua, không thể vào phòng khám."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if appt_date_local > today_local:
            window_open = appointment_time - timedelta(minutes=settings.CONSULTATION_WINDOW_BEFORE_MINUTES)
            if now < window_open:
                local_appt = timezone.localtime(appointment_time)
                return Response(
                    {
                        "detail": (
                            f"Phòng khám chưa mở. Lịch hẹn lúc "
                            f"{local_appt.strftime('%H:%M')} "
                            f"ngày {local_appt.strftime('%d/%m/%Y')}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if consultation.status == Consultation.Status.ACTIVE:
            token = _generate_agora_token(consultation.room_id, request.user.pk)
            return Response({
                "status":       "active",
                "agora_app_id": settings.AGORA_APP_ID,
                "agora_token":  token,
                "channel_name": consultation.room_id,
                "uid":          request.user.pk,
            })

        consultation.status = Consultation.Status.WAITING
        consultation.save(update_fields=["status"])

        Notification.objects.create(
            user=consultation.appointment.doctor.user,
            title="Bệnh nhân đang chờ khám",
            message=f"{consultation.appointment.patient.user.get_full_name()} đã vào phòng chờ.",
            type=Notification.Type.SYSTEM,
            related_object_id=consultation.pk,
        )

        return Response({
            "status":  "waiting",
            "message": "Đang chờ bác sĩ vào phòng...",
            "room_id": consultation.room_id,
        })

    @action(detail=True, methods=["post"], permission_classes=[HasDoctorOrAdminScope], url_path="start")
    def start(self, request, pk=None):
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc, không thể mở lại."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation.status     = Consultation.Status.ACTIVE
        consultation.started_at = timezone.now()
        consultation.save(update_fields=["status", "started_at"])

        token = _generate_agora_token(consultation.room_id, request.user.pk)

        return Response({
            "status":       "active",
            "agora_app_id": settings.AGORA_APP_ID,
            "agora_token":  token,
            "channel_name": consultation.room_id,
            "uid":          request.user.pk,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedWithValidToken], url_path="end")
    def end(self, request, pk=None):
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc rồi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation.status   = Consultation.Status.ENDED
        consultation.ended_at = timezone.now()
        consultation.save(update_fields=["status", "ended_at"])

        return Response({
            "detail":           "Phiên khám đã kết thúc.",
            "duration_minutes": consultation.get_duration_minutes(),
        })

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticatedWithValidToken], url_path="rtm-token")
    def rtm_token(self, request, pk=None):
        consultation = self.get_object()
        rtm_token = _generate_agora_rtm_token(str(request.user.pk))
        return Response({
            "rtm_token":    rtm_token,
            "agora_app_id": settings.AGORA_APP_ID,
            "channel_name": consultation.room_id,
            "uid":          str(request.user.pk),
        })

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedWithValidToken], url_path="messages")
    def messages(self, request, pk=None):
        consultation = self.get_object()

        if consultation.status == Consultation.Status.ENDED:
            return Response(
                {"detail": "Phiên khám đã kết thúc, không thể gửi tin nhắn."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        text = request.data.get("message", "").strip()
        if not text:
            return Response({"detail": "Tin nhắn không được để trống."}, status=status.HTTP_400_BAD_REQUEST)

        msg = ChatMessage.objects.create(
            consultation=consultation,
            sender=request.user,
            message=text,
        )
        return Response(ChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class VideoCallPageView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        app_id  = request.GET.get("appId",   "")
        token   = request.GET.get("token",   "")
        channel = request.GET.get("channel", "")
        uid     = request.GET.get("uid",     "0")
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <style>
    *{{margin:0;padding:0;box-sizing:border-box}}
    html,body{{width:100%;height:100%;background:#111827;font-family:sans-serif;overflow:hidden}}
    #app{{display:flex;flex-direction:column;height:100%}}
    #info{{background:#1565c0;color:#fff;text-align:center;padding:10px 16px;font-size:13px;font-weight:600}}
    #remote-wrap{{flex:1;position:relative;background:#1e293b;display:flex;align-items:center;justify-content:center}}
    #remote-player{{width:100%;height:100%}}
    #wait-msg{{color:#94a3b8;font-size:14px;position:absolute}}
    #local-wrap{{position:absolute;bottom:96px;right:12px;width:108px;height:148px;border-radius:14px;overflow:hidden;border:2.5px solid #fff;z-index:10;background:#0f172a}}
    #controls{{display:flex;justify-content:center;align-items:center;gap:20px;padding:14px 20px 22px;background:#1e293b}}
    .btn{{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}}
    .btn span{{font-size:26px;color:#fff;font-family:'Material Icons'}}
    #btn-end{{background:#dc2626}}
    #btn-mic,#btn-cam{{background:#374151}}
    .btn.muted{{background:#7f1d1d}}
    .btn-label{{color:#94a3b8;font-size:10px;text-align:center;margin-top:5px}}
    .btn-wrap{{display:flex;flex-direction:column;align-items:center}}
  </style>
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons"/>
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
    <div class="btn-wrap"><button class="btn" id="btn-mic"><span>mic</span></button><span class="btn-label">Micro</span></div>
    <div class="btn-wrap"><button class="btn" id="btn-end"><span>call_end</span></button><span class="btn-label">Rời gọi</span></div>
    <div class="btn-wrap"><button class="btn" id="btn-cam"><span>videocam</span></button><span class="btn-label">Camera</span></div>
  </div>
</div>
<script src="https://download.agora.io/sdk/release/AgoraRTC_N.js"></script>
<script>
const APP_ID="{app_id}",TOKEN="{token}",CHANNEL="{channel}",UID={uid};
let client,audioTrack,videoTrack,micMuted=false,camMuted=false;
const $=id=>document.getElementById(id);
const info=msg=>$('info').textContent=msg;
const post=d=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(d));
async function init(){{
  if(!APP_ID){{info('Agora chưa được cấu hình');return;}}
  try{{
    client=AgoraRTC.createClient({{mode:'rtc',codec:'vp8'}});
    client.on('user-published',async(u,t)=>{{
      await client.subscribe(u,t);
      if(t==='video'){{$('wait-msg').style.display='none';u.videoTrack.play('remote-player');}}
      if(t==='audio') u.audioTrack.play();
    }});
    client.on('user-left',()=>{{$('remote-player').innerHTML='';$('wait-msg').style.display='';$('wait-msg').textContent='Người kia đã rời cuộc gọi';}});
    info('Đang vào phòng...');
    await client.join(APP_ID,CHANNEL,TOKEN||null,UID||null);
    [audioTrack,videoTrack]=await AgoraRTC.createMicrophoneAndCameraTracks();
    videoTrack.play('local-player');
    await client.publish([audioTrack,videoTrack]);
    info('Đang khám — '+CHANNEL);
  }}catch(e){{info('Lỗi: '+e.message);post({{type:'CALL_ERROR',error:e.message}});}}
}}
$('btn-mic').onclick=async()=>{{micMuted=!micMuted;if(audioTrack)await audioTrack.setMuted(micMuted);$('btn-mic').querySelector('span').textContent=micMuted?'mic_off':'mic';$('btn-mic').classList.toggle('muted',micMuted);}};
$('btn-cam').onclick=async()=>{{camMuted=!camMuted;if(videoTrack)await videoTrack.setMuted(camMuted);$('btn-cam').querySelector('span').textContent=camMuted?'videocam_off':'videocam';$('btn-cam').classList.toggle('muted',camMuted);}};
$('btn-end').onclick=async()=>{{try{{if(audioTrack){{audioTrack.stop();audioTrack.close();}}if(videoTrack){{videoTrack.stop();videoTrack.close();}}if(client)await client.leave();}}catch(e){{}}post({{type:'END_CALL'}});}};
init();
</script>
</body>
</html>"""
        return HttpResponse(html, content_type="text/html")
