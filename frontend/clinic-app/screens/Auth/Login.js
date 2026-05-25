import { View, ScrollView, Image, StyleSheet } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Apis, { authApis, endpoints } from "../../configs/Apis";
import { useNavigation } from "@react-navigation/native";
import { MyDispatchContext } from "../../contexts/MyContext";
import { useContext } from "react";
import Styles from "../../styles/Styles";

const Login = () => {
    const [user, setUser]       = useState({});
    const [err, setErr]         = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const nav      = useNavigation();
    const dispatch = useContext(MyDispatchContext);

    const passwordRef = useRef(null);

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
            <View style={styles.header}>
                <Image source={require("../../assets/icon.png")} style={styles.logo} />
                <Text style={styles.appTitle}>Phòng Khám Đa Khoa</Text>
                <Text style={styles.appSub}>Hệ thống quản lý y tế trực tuyến</Text>
            </View>

            <View style={[Styles.padding, styles.form]}>
                <Text style={Styles.title}>Đăng nhập</Text>

                <HelperText type="error" visible={!!err} style={Styles.margin}>
                    {err}
                </HelperText>

                {/* Tên đăng nhập */}
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
                    outlineColor="#1565c0"
                    activeOutlineColor="#1565c0"
                />

                {/* Mật khẩu */}
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
                    outlineColor="#1565c0"
                    activeOutlineColor="#1565c0"
                />

                <Button
                    mode="contained"
                    onPress={login}
                    loading={loading}
                    disabled={loading}
                    style={styles.btn}
                    buttonColor="#1565c0"
                >
                    Đăng nhập
                </Button>

                <Button
                    mode="text"
                    onPress={() => nav.navigate("register")}
                    style={{ marginTop: 8 }}
                    textColor="#1565c0"
                >
                    Chưa có tài khoản? Đăng ký ngay
                </Button>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: "#1565c0",
        padding: 40,
        alignItems: "center",
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
    },
    appTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
    },
    appSub: {
        fontSize: 13,
        color: "#bbdefb",
        marginTop: 4,
    },
    form: {
        backgroundColor: "#fff",
        margin: 16,
        borderRadius: 16,
        elevation: 3,
        padding: 20,
    },
    btn: {
        borderRadius: 8,
        paddingVertical: 4,
        marginTop: 4,
    },
});

export default Login;