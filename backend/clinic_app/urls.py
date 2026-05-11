"""
clinic_app/urls.py
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# ─────────────────────────────────────────────
# Router — tự generate CRUD endpoints
# ─────────────────────────────────────────────
router = DefaultRouter()
router.register(r"specialties",        views.SpecialtyViewSet,        basename="specialty")
router.register(r"services",           views.ServiceViewSet,           basename="service")
router.register(r"patients",           views.PatientViewSet,           basename="patient")
router.register(r"doctors",            views.DoctorViewSet,            basename="doctor")
router.register(r"schedules",          views.DoctorScheduleViewSet,    basename="schedule")
router.register(r"appointments",       views.AppointmentViewSet,       basename="appointment")
router.register(r"medical-records",    views.MedicalRecordViewSet,     basename="medical-record")
router.register(r"medicine-categories",views.MedicineCategoryViewSet,  basename="medicine-category")
router.register(r"medicines",          views.MedicineViewSet,          basename="medicine")
router.register(r"inventory",          views.InventoryViewSet,         basename="inventory")
router.register(r"inventory-alerts",   views.InventoryAlertViewSet,    basename="inventory-alert")
router.register(r"prescriptions",      views.PrescriptionViewSet,      basename="prescription")
router.register(r"payments",           views.PaymentViewSet,           basename="payment")
router.register(r"consultations",      views.ConsultationViewSet,      basename="consultation")
router.register(r"notifications",      views.NotificationViewSet,      basename="notification")

# ─────────────────────────────────────────────
# URL patterns
# ─────────────────────────────────────────────
urlpatterns = [

    # ── Auth ─────────────────────────────────
    path("auth/register/",        views.RegisterView.as_view(),      name="register"),
    path("auth/me/",              views.MeView.as_view(),             name="me"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change-password"),

    # Firebase custom token — client dùng để chat realtime
    path("auth/firebase-token/",  views.FirebaseTokenView.as_view(),  name="firebase-token"),

    # ── Admin Dashboard ───────────────────────
    path("admin/dashboard/",      views.DashboardView.as_view(),      name="dashboard"),

    # ── Router ────────────────────────────────
    path("", include(router.urls)),
]

# ─────────────────────────────────────────────
# AUTH FLOW (OAuth2)
# ─────────────────────────────────────────────
#
#  1. Đăng ký:
#       POST /api/auth/register/          body: email, username, password, role
#
#  2. Lấy token:
#       POST /o/token/
#         grant_type=password
#         username=<email>
#         password=<password>
#         client_id=<client_id>
#         client_secret=<client_secret>
#         scope=patient              ← hoặc doctor / admin
#
#  3. Dùng API:
#       Authorization: Bearer <access_token>
#
#  4. Refresh token:
#       POST /o/token/
#         grant_type=refresh_token
#         refresh_token=<refresh_token>
#         client_id=<client_id>
#         client_secret=<client_secret>
#
#  5. Thu hồi token:
#       POST /o/revoke_token/
#
# ─────────────────────────────────────────────
# FIREBASE CHAT FLOW
# ─────────────────────────────────────────────
#
#  1. Client gọi POST /api/auth/firebase-token/
#       → nhận firebase_token (custom token, hiệu lực 1h)
#
#  2. Client gọi signInWithCustomToken(firebase_token) trong Firebase SDK
#       → nhận Firebase ID token
#
#  3. Khi Appointment confirmed, signal tự tạo Consultation record
#
#  4. Doctor gọi POST /api/consultations/{id}/start/
#       → server sync metadata lên Firestore: consultations/{id}
#
#  5. Client lắng nghe Firestore:
#       db.collection("consultations").doc(id).collection("messages")
#         .orderBy("sentAt").onSnapshot(...)
#
#  6. Client ghi tin nhắn:
#       db.collection("consultations").doc(id).collection("messages").add({
#         senderUid: "clinic_X",
#         text: "...",
#         sentAt: serverTimestamp(),
#       })
#
#  7. Doctor gọi POST /api/consultations/{id}/end/
#
# ─────────────────────────────────────────────
# FIRESTORE SECURITY RULES (triển khai trên Firebase Console)
# ─────────────────────────────────────────────
#
#  rules_version = '2';
#  service cloud.firestore {
#    match /databases/{database}/documents {
#      match /consultations/{consultationId} {
#        // Chỉ participant mới đọc được metadata
#        allow read: if request.auth.uid in resource.data.participants;
#
#        match /messages/{messageId} {
#          // Chỉ participant mới đọc/viết tin nhắn
#          allow read, write: if request.auth.uid in
#            get(/databases/$(database)/documents/consultations/$(consultationId)).data.participants;
#        }
#      }
#    }
#  }