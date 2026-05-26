import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PaperProvider } from "react-native-paper";
import { useReducer, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View, Platform } from "react-native";
import Constants from "expo-constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { MyUserContext, MyDispatchContext, MyReducer } from "./contexts/MyContext";
import Login from "./screens/Auth/Login";
import Register from "./screens/Auth/Register";
import ChangePassword from "./screens/Auth/ChangePassword";
import Home from "./screens/Home/Home";
import DoctorList from "./screens/Doctor/DoctorList";
import DoctorDetail from "./screens/Doctor/DoctorDetail";
import BookAppointment from "./screens/Appointment/BookAppointment";
import MyAppointments from "./screens/Appointment/MyAppointments";
import AppointmentDetail from "./screens/Appointment/AppointmentDetail";
import SpecialtySelect from "./screens/Appointment/SpecialtySelect";
import DateSelect from "./screens/Appointment/DateSelect";
import SlotSelect from "./screens/Appointment/SlotSelect";
import { Profile, Prescriptions, Payments } from "./screens/Profile/Profile";
import { MedicalRecords, MedicalRecordDetail } from "./screens/Profile/MedicalRecords";
import Notifications from "./screens/Notification/Notifications";
import NotificationDetail from "./screens/Notification/NotificationDetail";
import PaymentScreen from "./screens/Payment/PaymentScreen";
import PaymentWebView from "./screens/Payment/PaymentWebView";
import PaymentResult from "./screens/Payment/PaymentResult";

// Doctor screens
import DoctorDashboard from "./screens/Doctor/DoctorDashboard";
import DoctorAppointments from "./screens/Doctor/DoctorAppointments";
import DoctorAppointmentDetail from "./screens/Doctor/DoctorAppointmentDetail";
import DoctorMedicalRecords from "./screens/Doctor/DoctorMedicalRecords";
import DoctorSchedules from "./screens/Doctor/DoctorSchedules";
import DoctorConsultations from "./screens/Doctor/DoctorConsultations";

// Consultation screens
import ConsultationRoom from "./screens/Consultation/ConsultationRoom";
import VideoCallScreen from "./screens/Consultation/VideoCallScreen";

// Staff screens
import StaffDashboard from "./screens/Staff/StaffDashboard";
import StaffAppointments from "./screens/Staff/StaffAppointments";
import StaffAppointmentDetail from "./screens/Staff/StaffAppointmentDetail";
import StaffFindPatient from "./screens/Staff/StaffFindPatient";
import StaffInventory from "./screens/Staff/StaffInventory";
import StaffPayments from "./screens/Staff/StaffPayments";
import StaffPrescriptions from "./screens/Staff/StaffPrescriptions";

// Shared
import StaffDoctorProfile from "./screens/Shared/StaffDoctorProfile";

import * as ExpoNotifications from "expo-notifications";
import { authApis, endpoints } from "./configs/Apis";
import { COLORS } from "./styles/Styles";

ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  true,
    }),
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HS = {
    headerStyle: { backgroundColor: COLORS.primaryDark },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "800", fontSize: 17 },
    headerShadowVisible: false,
};

const TAB_BASE_STYLE = {
    headerShown: false,
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textLight,
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
};

const TAB_BAR_BASE = {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: "#fff",
    elevation: 12,
    shadowColor: "#1565c0",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
};

const useTabStyle = () => {
    const { bottom } = useSafeAreaInsets();
    return {
        ...TAB_BASE_STYLE,
        tabBarStyle: {
            ...TAB_BAR_BASE,
            height: 56 + Math.max(bottom, 8),
            paddingBottom: Math.max(bottom, 8),
        },
    };
};

// ─────────────────────────── PATIENT STACKS ───────────────────────────

const HomeStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="home-main" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="specialty-select" component={SpecialtySelect} options={{ title: "Chọn chuyên khoa" }} />
        <Stack.Screen name="date-select" component={DateSelect} options={{ title: "Chọn ngày khám" }} />
        <Stack.Screen name="slot-select" component={SlotSelect} options={{ title: "Chọn ca khám" }} />
        <Stack.Screen name="doctor-list" component={DoctorList} options={{ title: "Tìm bác sĩ" }} />
        <Stack.Screen name="doctor-detail" component={DoctorDetail} options={{ title: "Thông tin bác sĩ" }} />
        <Stack.Screen name="book-appointment" component={BookAppointment} options={{ title: "Đặt lịch khám" }} />
        <Stack.Screen name="my-appointments" component={MyAppointments} options={{ title: "Lịch hẹn của tôi" }} />
        <Stack.Screen name="appointment-detail" component={AppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
        <Stack.Screen name="medical-records" component={MedicalRecords} options={{ title: "Hồ sơ bệnh án" }} />
        <Stack.Screen name="medical-record-detail" component={MedicalRecordDetail} options={{ title: "Chi tiết bệnh án" }} />
        <Stack.Screen name="prescriptions" component={Prescriptions} options={{ title: "Đơn thuốc" }} />
        <Stack.Screen name="prescription-detail" component={Prescriptions} options={{ title: "Chi tiết đơn thuốc" }} />
        <Stack.Screen name="payments" component={Payments} options={{ title: "Thanh toán" }} />
        <Stack.Screen name="payment-screen" component={PaymentScreen} options={{ title: "Chọn phương thức thanh toán" }} />
        <Stack.Screen name="payment-webview" component={PaymentWebView} options={{ headerShown: false }} />
        <Stack.Screen name="payment-result" component={PaymentResult} options={{ headerShown: false }} />
        <Stack.Screen name="notifications"      component={Notifications}      options={{ title: "Thông báo" }} />
        <Stack.Screen name="notification-detail" component={NotificationDetail} options={{ title: "Chi tiết thông báo" }} />
        <Stack.Screen name="change-password" component={ChangePassword} options={{ title: "Đổi mật khẩu" }} />
        <Stack.Screen name="consultation-room" component={ConsultationRoom} options={{ title: "Phòng khám trực tuyến" }} />
        <Stack.Screen name="video-call" component={VideoCallScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
);

const BookingStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="booking-main" component={SpecialtySelect} options={{ title: "Chọn chuyên khoa" }} />
        <Stack.Screen name="date-select" component={DateSelect} options={{ title: "Chọn ngày khám" }} />
        <Stack.Screen name="slot-select" component={SlotSelect} options={{ title: "Chọn ca khám" }} />
        <Stack.Screen name="book-appointment" component={BookAppointment} options={{ title: "Đặt lịch khám" }} />
        <Stack.Screen name="my-appointments" component={MyAppointments} options={{ title: "Lịch hẹn của tôi" }} />
        <Stack.Screen name="appointment-detail" component={AppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
        <Stack.Screen name="payment-screen" component={PaymentScreen} options={{ title: "Chọn phương thức thanh toán" }} />
        <Stack.Screen name="payment-webview" component={PaymentWebView} options={{ headerShown: false }} />
        <Stack.Screen name="payment-result" component={PaymentResult} options={{ headerShown: false }} />
    </Stack.Navigator>
);

const NotifStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="notif-main"          component={Notifications}      options={{ headerShown: false }} />
        <Stack.Screen name="notification-detail" component={NotificationDetail} options={{ title: "Chi tiết thông báo" }} />
    </Stack.Navigator>
);

const ProfileStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="profile-main" component={Profile} options={{ headerShown: false }} />
        <Stack.Screen name="medical-records" component={MedicalRecords} options={{ title: "Hồ sơ bệnh án" }} />
        <Stack.Screen name="medical-record-detail" component={MedicalRecordDetail} options={{ title: "Chi tiết bệnh án" }} />
        <Stack.Screen name="prescriptions" component={Prescriptions} options={{ title: "Đơn thuốc" }} />
        <Stack.Screen name="prescription-detail" component={Prescriptions} options={{ title: "Chi tiết đơn thuốc" }} />
        <Stack.Screen name="payments" component={Payments} options={{ title: "Lịch sử thanh toán" }} />
        <Stack.Screen name="payment-screen" component={PaymentScreen} options={{ title: "Chọn phương thức thanh toán" }} />
        <Stack.Screen name="payment-webview" component={PaymentWebView} options={{ headerShown: false }} />
        <Stack.Screen name="payment-result" component={PaymentResult} options={{ headerShown: false }} />
        <Stack.Screen name="change-password" component={ChangePassword} options={{ title: "Đổi mật khẩu" }} />
    </Stack.Navigator>
);

// ─────────────────────────── PATIENT TABS ───────────────────────────

const AppTabs = () => {
    const tabStyle = useTabStyle();
    return (
    <Tab.Navigator screenOptions={tabStyle}>
        <Tab.Screen
            name="home-tab"
            component={HomeStack}
            options={{
                title: "Trang chủ",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="home-variant" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="booking-tab"
            component={BookingStack}
            options={{
                title: "Đặt khám",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="calendar-plus" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="notifications-tab"
            component={NotifStack}
            options={{
                title: "Thông báo",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="bell-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="profile-tab"
            component={ProfileStack}
            options={{
                title: "Cá nhân",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="account-circle-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
    </Tab.Navigator>
    );
};

// ─────────────────────────── DOCTOR STACKS ───────────────────────────

const DoctorHomeStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="doctor-dashboard" component={DoctorDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="doctor-appointments" component={DoctorAppointments} options={{ title: "Lịch hẹn" }} />
        <Stack.Screen name="doctor-today-appointments" component={DoctorAppointments} options={{ title: "Lịch hôm nay" }} />
        <Stack.Screen name="doctor-appointment-detail" component={DoctorAppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
        <Stack.Screen name="doctor-medical-records" component={DoctorMedicalRecords} options={{ title: "Hồ sơ bệnh án" }} />
        <Stack.Screen name="doctor-medical-record-detail" component={DoctorMedicalRecords} options={{ title: "Chi tiết bệnh án" }} />
        <Stack.Screen name="notifications"      component={Notifications}      options={{ title: "Thông báo" }} />
        <Stack.Screen name="notification-detail" component={NotificationDetail} options={{ title: "Chi tiết thông báo" }} />
        <Stack.Screen name="doctor-prescriptions" component={Prescriptions} options={{ title: "Đơn thuốc" }} />
        <Stack.Screen name="doctor-schedules" component={DoctorSchedules} options={{ title: "Lịch làm việc" }} />
        <Stack.Screen name="doctor-profile" component={StaffDoctorProfile} options={{ headerShown: false }} />
        <Stack.Screen name="doctor-consultations" component={DoctorConsultations} options={{ title: "Tư vấn trực tuyến" }} />
        <Stack.Screen name="consultation-room" component={ConsultationRoom} options={{ title: "Phòng khám trực tuyến" }} />
        <Stack.Screen name="video-call" component={VideoCallScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
);

const DoctorAppointmentsStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="doc-appts-main" component={DoctorAppointments} options={{ title: "Lịch hẹn" }} />
        <Stack.Screen name="doctor-appointment-detail" component={DoctorAppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
        <Stack.Screen name="doctor-medical-records" component={DoctorMedicalRecords} options={{ title: "Hồ sơ bệnh án" }} />
        <Stack.Screen name="doctor-medical-record-detail" component={DoctorMedicalRecords} options={{ title: "Chi tiết bệnh án" }} />
        <Stack.Screen name="consultation-room" component={ConsultationRoom} options={{ title: "Phòng khám trực tuyến" }} />
        <Stack.Screen name="video-call" component={VideoCallScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
);

const DoctorSchedulesStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="doctor-schedules" component={DoctorSchedules} options={{ title: "Lịch làm việc" }} />
        <Stack.Screen name="doctor-my-schedules" component={DoctorSchedules} options={{ title: "Ca trực của tôi" }} />
    </Stack.Navigator>
);

const DoctorMedicalStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="doc-records-main" component={DoctorMedicalRecords} options={{ title: "Hồ sơ bệnh án" }} />
        <Stack.Screen name="doctor-medical-record-detail" component={DoctorMedicalRecords} options={{ title: "Chi tiết bệnh án" }} />
        <Stack.Screen name="doctor-appointment-detail" component={DoctorAppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
    </Stack.Navigator>
);

const DoctorProfileStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="doctor-profile" component={StaffDoctorProfile} options={{ headerShown: false }} />
        <Stack.Screen name="doctor-schedules" component={DoctorSchedules} options={{ title: "Lịch làm việc" }} />
        <Stack.Screen name="doctor-my-schedules" component={DoctorSchedules} options={{ title: "Ca trực của tôi" }} />
        <Stack.Screen name="doctor-medical-records" component={DoctorMedicalRecords} options={{ title: "Hồ sơ bệnh án" }} />
        <Stack.Screen name="doctor-prescriptions" component={Prescriptions} options={{ title: "Đơn thuốc" }} />
        <Stack.Screen name="notifications"      component={Notifications}      options={{ title: "Thông báo" }} />
        <Stack.Screen name="notification-detail" component={NotificationDetail} options={{ title: "Chi tiết thông báo" }} />
        <Stack.Screen name="change-password"     component={ChangePassword}     options={{ title: "Đổi mật khẩu" }} />
    </Stack.Navigator>
);

// ─────────────────────────── DOCTOR TABS ───────────────────────────

const DoctorTabs = () => {
    const tabStyle = useTabStyle();
    return (
    <Tab.Navigator screenOptions={tabStyle}>
        <Tab.Screen
            name="doctor-home-tab"
            component={DoctorHomeStack}
            options={{
                title: "Tổng quan",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="view-dashboard-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="doctor-appointments-tab"
            component={DoctorAppointmentsStack}
            options={{
                title: "Lịch hẹn",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="calendar-check-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="doctor-schedules-tab"
            component={DoctorSchedulesStack}
            options={{
                title: "Ca trực",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="calendar-clock-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="doctor-records-tab"
            component={DoctorMedicalStack}
            options={{
                title: "Bệnh án",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="file-document-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="doctor-profile-tab"
            component={DoctorProfileStack}
            options={{
                title: "Cá nhân",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="account-circle-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
    </Tab.Navigator>
    );
};

// ─────────────────────────── STAFF STACKS ───────────────────────────

const StaffHomeStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="staff-dashboard" component={StaffDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="staff-appointments" component={StaffAppointments} options={{ title: "Lịch hẹn" }} />
        <Stack.Screen name="staff-appointment-detail" component={StaffAppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
        <Stack.Screen name="staff-collect-payment" component={StaffPayments} options={{ title: "Thu tiền" }} />
        <Stack.Screen name="notifications"      component={Notifications}      options={{ title: "Thông báo" }} />
        <Stack.Screen name="notification-detail" component={NotificationDetail} options={{ title: "Chi tiết thông báo" }} />
        <Stack.Screen name="staff-prescriptions" component={StaffPrescriptions} options={{ title: "Đơn thuốc" }} />
        <Stack.Screen name="staff-payments" component={StaffPayments} options={{ title: "Thanh toán" }} />
        <Stack.Screen name="staff-find-patient" component={StaffFindPatient} options={{ title: "Tìm bệnh nhân" }} />
        <Stack.Screen name="staff-inventory" component={StaffInventory} options={{ title: "Kho thuốc" }} />
        <Stack.Screen name="staff-profile" component={StaffDoctorProfile} options={{ headerShown: false }} />
    </Stack.Navigator>
);

const StaffAppointmentsStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="staff-appts-main" component={StaffAppointments} options={{ title: "Lịch hẹn" }} />
        <Stack.Screen name="staff-appointment-detail" component={StaffAppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
        <Stack.Screen name="staff-collect-payment" component={StaffPayments} options={{ title: "Thu tiền" }} />
    </Stack.Navigator>
);

const StaffPrescriptionsStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="staff-prescriptions-main" component={StaffPrescriptions} options={{ title: "Đơn thuốc" }} />
    </Stack.Navigator>
);

const StaffInventoryStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="staff-inventory" component={StaffInventory} options={{ title: "Kho thuốc" }} />
        <Stack.Screen name="staff-inventory-alerts" component={StaffInventory} options={{ title: "Cảnh báo kho" }} />
    </Stack.Navigator>
);

const StaffPaymentsStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="staff-payments-main" component={StaffPayments} options={{ title: "Thanh toán" }} />
    </Stack.Navigator>
);

const StaffProfileStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="staff-profile" component={StaffDoctorProfile} options={{ headerShown: false }} />
        <Stack.Screen name="staff-find-patient" component={StaffFindPatient} options={{ title: "Tìm bệnh nhân" }} />
        <Stack.Screen name="staff-patients" component={StaffFindPatient} options={{ title: "Danh sách bệnh nhân" }} />
        <Stack.Screen name="staff-inventory" component={StaffInventory} options={{ title: "Kho thuốc" }} />
        <Stack.Screen name="staff-payments" component={StaffPayments} options={{ title: "Thanh toán" }} />
        <Stack.Screen name="notifications"      component={Notifications}      options={{ title: "Thông báo" }} />
        <Stack.Screen name="notification-detail" component={NotificationDetail} options={{ title: "Chi tiết thông báo" }} />
        <Stack.Screen name="change-password"     component={ChangePassword}     options={{ title: "Đổi mật khẩu" }} />
    </Stack.Navigator>
);

// ─────────────────────────── STAFF TABS ───────────────────────────

const StaffTabs = () => {
    const tabStyle = useTabStyle();
    return (
    <Tab.Navigator screenOptions={tabStyle}>
        <Tab.Screen
            name="staff-home-tab"
            component={StaffHomeStack}
            options={{
                title: "Tổng quan",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="view-dashboard-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="staff-appointments-tab"
            component={StaffAppointmentsStack}
            options={{
                title: "Lịch hẹn",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="calendar-check-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="staff-prescriptions-tab"
            component={StaffPrescriptionsStack}
            options={{
                title: "Đơn thuốc",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="pill" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="staff-inventory-tab"
            component={StaffInventoryStack}
            options={{
                title: "Kho thuốc",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="package-variant-closed" size={size ?? 24} color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="staff-profile-tab"
            component={StaffProfileStack}
            options={{
                title: "Cá nhân",
                tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="account-circle-outline" size={size ?? 24} color={color} />
                ),
            }}
        />
    </Tab.Navigator>
    );
};

// ─────────────────────────── AUTH STACK ───────────────────────────

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" component={Login} />
        <Stack.Screen name="register" component={Register} />
    </Stack.Navigator>
);

// ─────────────────────────── ROOT ───────────────────────────

const getRoleNavigator = (role) => {
    switch (role) {
        case "doctor": return <DoctorTabs />;
        case "staff":  return <StaffTabs />;
        default:       return <AppTabs />;
    }
};

const App = () => {
    const [user, dispatch] = useReducer(MyReducer, null);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                if (token) {
                    const res = await authApis(token).get(endpoints["current-user"]);
                    const userData = res.data;
                    const storedScope = await AsyncStorage.getItem("token_scope");
                    if (!storedScope || storedScope !== userData.role) {
                        await AsyncStorage.multiRemove(["token", "token_scope"]);
                        setInitializing(false);
                        return;
                    }
                    dispatch({ type: "login", payload: { ...userData, token } });
                }
            } catch (e) {
                await AsyncStorage.multiRemove(["token", "token_scope"]);
            } finally {
                setInitializing(false);
            }
        };
        restoreSession();
    }, []);

    useEffect(() => {
        if (!user?.token) return;
        if (Constants.appOwnership === "expo") return; // skip in Expo Go
        const registerPushToken = async () => {
            try {
                const { status } = await ExpoNotifications.requestPermissionsAsync();
                if (status !== "granted") return;
                const { data: pushToken } = await ExpoNotifications.getExpoPushTokenAsync();
                await authApis(user.token).patch(endpoints["current-user"], { push_token: pushToken });
            } catch (_) {}
        };
        registerPushToken();
    }, [user?.id]);

    if (initializing) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primaryDark }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
        <PaperProvider>
            <MyUserContext.Provider value={user}>
                <MyDispatchContext.Provider value={dispatch}>
                    <NavigationContainer>
                        {user ? getRoleNavigator(user.role) : <AuthStack />}
                    </NavigationContainer>
                </MyDispatchContext.Provider>
            </MyUserContext.Provider>
        </PaperProvider>
        </SafeAreaProvider>
    );
};

export default App;