import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Icon, PaperProvider } from "react-native-paper";
import { useReducer, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";

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
import { authApis, endpoints } from "./configs/Apis";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HS = {
    headerStyle: { backgroundColor: "#1565c0" },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "bold" },
};

const HomeStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="home-main" component={Home} options={{ title: "Trang chủ" }} />
        <Stack.Screen name="doctor-list" component={DoctorList} options={{ title: "Tìm bác sĩ" }} />
        <Stack.Screen name="doctor-detail" component={DoctorDetail} options={{ title: "Thông tin bác sĩ" }} />
        <Stack.Screen name="book-appointment" component={BookAppointment} options={{ title: "Đặt lịch hẹn" }} />
        <Stack.Screen name="my-appointments" component={MyAppointments} options={{ title: "Lịch hẹn của tôi" }} />
        <Stack.Screen name="appointment-detail" component={AppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
        <Stack.Screen name="medical-records" component={MedicalRecords} options={{ title: "Hồ sơ bệnh án" }} />
        <Stack.Screen name="medical-record-detail" component={MedicalRecordDetail} options={{ title: "Chi tiết bệnh án" }} />
        <Stack.Screen name="prescriptions" component={Prescriptions} options={{ title: "Đơn thuốc" }} />
        <Stack.Screen name="payments" component={Payments} options={{ title: "Thanh toán" }} />
        <Stack.Screen name="notifications" component={Notifications} options={{ title: "Thông báo" }} />
    </Stack.Navigator>
);

const AppointmentsStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="appts-main" component={MyAppointments} options={{ title: "Lịch hẹn của tôi" }} />
        <Stack.Screen name="appointment-detail" component={AppointmentDetail} options={{ title: "Chi tiết lịch hẹn" }} />
        <Stack.Screen name="book-appointment" component={BookAppointment} options={{ title: "Đặt lịch hẹn" }} />
        <Stack.Screen name="doctor-list" component={DoctorList} options={{ title: "Tìm bác sĩ" }} />
        <Stack.Screen name="doctor-detail" component={DoctorDetail} options={{ title: "Thông tin bác sĩ" }} />
    </Stack.Navigator>
);

const ProfileStack = () => (
    <Stack.Navigator screenOptions={HS}>
        <Stack.Screen name="profile-main" component={Profile} options={{ title: "Hồ sơ cá nhân" }} />
        <Stack.Screen name="medical-records" component={MedicalRecords} options={{ title: "Hồ sơ bệnh án" }} />
        <Stack.Screen name="medical-record-detail" component={MedicalRecordDetail} options={{ title: "Chi tiết bệnh án" }} />
        <Stack.Screen name="prescriptions" component={Prescriptions} options={{ title: "Đơn thuốc" }} />
        <Stack.Screen name="payments" component={Payments} options={{ title: "Thanh toán" }} />
        <Stack.Screen name="change-password" component={ChangePassword} options={{ title: "Đổi mật khẩu" }} />
    </Stack.Navigator>
);

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" component={Login} />
        <Stack.Screen name="register" component={Register} />
    </Stack.Navigator>
);

const AppTabs = () => (
    <Tab.Navigator
        screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#1565c0",
            tabBarInactiveTintColor: "#9e9e9e",
            tabBarStyle: { elevation: 8, height: 60, paddingBottom: 8 },
        }}
    >
        <Tab.Screen name="home-tab" component={HomeStack}
            options={{ title: "Trang chủ", tabBarIcon: ({ color, size }) => <Icon source="home" size={size} color={color} /> }} />
        <Tab.Screen name="appointments-tab" component={AppointmentsStack}
            options={{ title: "Lịch hẹn", tabBarIcon: ({ color, size }) => <Icon source="calendar-clock" size={size} color={color} /> }} />
        <Tab.Screen name="notifications-tab" component={Notifications}
            options={{
                title: "Thông báo",
                tabBarIcon: ({ color, size }) => <Icon source="bell" size={size} color={color} />,
                headerShown: true, headerTitle: "Thông báo",
                headerStyle: { backgroundColor: "#1565c0" }, headerTintColor: "#fff",
            }} />
        <Tab.Screen name="profile-tab" component={ProfileStack}
            options={{ title: "Hồ sơ", tabBarIcon: ({ color, size }) => <Icon source="account" size={size} color={color} /> }} />
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
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1565c0" }}>
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
