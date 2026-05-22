import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PaperProvider } from "react-native-paper";
import { useReducer, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
import { Profile, Prescriptions, Payments } from "./screens/Profile/Profile";
import { MedicalRecords, MedicalRecordDetail } from "./screens/Profile/MedicalRecords";
import Notifications from "./screens/Notification/Notifications";
import PaymentScreen from "./screens/Payment/PaymentScreen";
import PaymentWebView from "./screens/Payment/PaymentWebView";
import PaymentResult from "./screens/Payment/PaymentResult";
import { authApis, endpoints } from "./configs/Apis";
import { COLORS } from "./styles/Styles";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HS = {
    headerStyle: { backgroundColor: COLORS.primaryDark },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "800", fontSize: 17 },
    headerShadowVisible: false,
};

const HomeStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="home-main" component={Home} options={{ headerShown: false }} />
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
        <Stack.Screen name="notifications" component={Notifications} options={{ title: "Thông báo" }} />
        <Stack.Screen name="change-password" component={ChangePassword} options={{ title: "Đổi mật khẩu" }} />
    </Stack.Navigator>
);

const BookingStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="booking-main" component={DoctorList} options={{ title: "Chọn bác sĩ để đặt khám" }} />
        <Stack.Screen name="doctor-detail" component={DoctorDetail} options={{ title: "Thông tin bác sĩ" }} />
        <Stack.Screen name="book-appointment" component={BookAppointment} options={{ title: "Đặt lịch khám" }} />
        <Stack.Screen name="my-appointments" component={MyAppointments} options={{ title: "Lịch hẹn của tôi" }} />
        <Stack.Screen name="appointment-detail" component={AppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
    </Stack.Navigator>
);

const NotifStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="notif-main" component={Notifications} options={{ headerShown: false }} />
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

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" component={Login} />
        <Stack.Screen name="register" component={Register} />
    </Stack.Navigator>
);

const TAB_STYLE = {
    headerShown: false,
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textLight,
    tabBarStyle: {
        height: Platform.OS === "ios" ? 84 : 72,
        paddingBottom: Platform.OS === "ios" ? 28 : 14,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: "#fff",
        elevation: 12,
        shadowColor: "#1565c0",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
};

const AppTabs = () => (
    <Tab.Navigator screenOptions={TAB_STYLE}>
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

const App = () => {
    const [user, dispatch] = useReducer(MyReducer, null);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                if (token) {
                    const res = await authApis(token).get(endpoints["current-user"]);
                    dispatch({ type: "login", payload: { ...res.data, token } });
                }
            } catch (e) {
                await AsyncStorage.removeItem("token");
            } finally {
                setInitializing(false);
            }
        };
        restoreSession();
    }, []);

    if (initializing) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primaryDark }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <PaperProvider>
            <MyUserContext.Provider value={user}>
                <MyDispatchContext.Provider value={dispatch}>
                    <NavigationContainer>
                        {user ? <AppTabs /> : <AuthStack />}
                    </NavigationContainer>
                </MyDispatchContext.Provider>
            </MyUserContext.Provider>
        </PaperProvider>
    );
};

export default App;