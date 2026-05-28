import { View, ScrollView, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { useState, useRef, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Apis, { authApis, endpoints } from "../../configs/Apis";
import { useNavigation } from "@react-navigation/native";
import { MyDispatchContext } from "../../contexts/MyContext";
import Styles, { COLORS } from "../../styles/Styles";
import { loginStyles as S } from "./Styles";

const Login = () => {
    const [user, setUser]         = useState({});
    const [err, setErr]           = useState(null);
    const [loading, setLoading]   = useState(false);
    const [showPass, setShowPass] = useState(false);
    const nav      = useNavigation();
    const dispatch = useContext(MyDispatchContext);
    const passwordRef = useRef(null);

    useEffect(() => {
        const sub = Linking.addEventListener("url", handleDeepLink);
        return () => sub.remove();
    }, []);

    const handleDeepLink = async ({ url }) => {
        if (!url?.startsWith("com.clinic.app://auth")) return;
        const { queryParams } = Linking.parse(url);
        if (queryParams?.error) {
            setErr("Đăng nhập Google thất bại: " + queryParams.error);
            setLoading(false);
            return;
        }
        const token = queryParams?.token;
        const scope = queryParams?.scope || "patient";
        if (!token) return;
        try {
            await AsyncStorage.setItem("token", token);
            await AsyncStorage.setItem("token_scope", scope);
            const currentUser = await authApis(token).get(endpoints["current-user"]);
            dispatch({ type: "login", payload: { ...currentUser.data, token } });
        } catch {
            setErr("Không thể xác thực tài khoản Google!");
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        try {
            setLoading(true);
            setErr(null);
            const res = await Apis.get(endpoints["google-oauth-url"]);
            const googleUrl = res.data?.url;
            if (!googleUrl) throw new Error("Không lấy được URL Google.");
            const result = await WebBrowser.openAuthSessionAsync(googleUrl, "com.clinic.app://auth");
            if (result?.type === "success" && result?.url) {
                await handleDeepLink({ url: result.url });
            } else {
                setLoading(false);
            }
        } catch (e) {
            setErr("Không thể kết nối Google. Thử lại sau!");
            setLoading(false);
        }
    };

    const validate = () => {
        if (!user.username) { setErr("Vui lòng nhập tên đăng nhập!"); return false; }
        if (!user.password) { setErr("Vui lòng nhập mật khẩu!");      return false; }
        return true;
    };

    const login = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            setErr(null);
            const res = await Apis.post(endpoints["login"], {
                username: user.username.trim(),
                password: user.password.trim(),
            });
            await AsyncStorage.setItem("token", res.data.access_token);
            await AsyncStorage.setItem("token_scope", res.data.scope);
            const currentUser = await authApis(res.data.access_token).get(endpoints["current-user"]);
            dispatch({ type: "login", payload: { ...currentUser.data, token: res.data.access_token } });
        } catch (ex) {
            console.error(ex);
            setErr("Đăng nhập thất bại. Kiểm tra lại tên đăng nhập và mật khẩu!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={Styles.container}>
            <View style={S.header}>
                <Image source={require("../../assets/icon.png")} style={S.logo} />
                <Text style={S.appTitle}>Phòng Khám Đa Khoa</Text>
                <Text style={S.appSub}>Hệ thống quản lý y tế trực tuyến</Text>
            </View>

            <View style={[Styles.padding, S.form]}>
                <Text style={Styles.title}>Đăng nhập</Text>

                <HelperText type="error" visible={!!err} style={Styles.margin}>
                    {err}
                </HelperText>

                <TextInput
                    label="Tên đăng nhập"
                    value={user.username || ""}
                    onChangeText={(t) => setUser({ ...user, username: t })}
                    style={[Styles.margin, loading && { opacity: 0.5 }]}
                    mode="outlined"
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                    right={<TextInput.Icon icon="account" />}
                    outlineColor={COLORS.primary}
                    activeOutlineColor={COLORS.primary}
                />

                <TextInput
                    ref={passwordRef}
                    label="Mật khẩu"
                    value={user.password || ""}
                    onChangeText={(t) => setUser({ ...user, password: t })}
                    style={[Styles.margin, loading && { opacity: 0.5 }]}
                    mode="outlined"
                    secureTextEntry={!showPass}
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={login}
                    right={
                        <TextInput.Icon
                            icon={showPass ? "eye-off" : "eye"}
                            onPress={() => setShowPass(!showPass)}
                        />
                    }
                    outlineColor={COLORS.primary}
                    activeOutlineColor={COLORS.primary}
                />

                <Button
                    mode="contained"
                    onPress={login}
                    loading={loading}
                    disabled={loading}
                    style={S.btn}
                    buttonColor={COLORS.primary}
                >
                    Đăng nhập
                </Button>

                <View style={localS.dividerRow}>
                    <View style={localS.dividerLine} />
                    <Text style={localS.dividerText}>hoặc</Text>
                    <View style={localS.dividerLine} />
                </View>

                <TouchableOpacity
                    style={[localS.googleBtn, loading && { opacity: 0.6 }]}
                    onPress={loginWithGoogle}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
                    <Text style={localS.googleBtnText}>Tiếp tục với Google</Text>
                </TouchableOpacity>

                <Button
                    mode="text"
                    onPress={() => nav.navigate("register")}
                    style={{ marginTop: 8 }}
                    textColor={COLORS.primary}
                >
                    Chưa có tài khoản? Đăng ký ngay
                </Button>
            </View>
        </ScrollView>
    );
};

const localS = StyleSheet.create({
    dividerRow:     { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
    dividerLine:    { flex: 1, height: 1, backgroundColor: COLORS.border },
    dividerText:    { fontSize: 12, color: COLORS.textMuted },
    googleBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 13, backgroundColor: "#fff", marginBottom: 4 },
    googleBtnText:  { fontSize: 15, fontWeight: "700", color: COLORS.text },
});

export default Login;
