import { View, ScrollView, TouchableOpacity, Image } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import * as ImgPicker from "expo-image-picker";
import { useState, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Apis, { authApis, endpoints } from "../../../configs/Apis";
import { useNavigation } from "@react-navigation/native";
import { MyDispatchContext } from "../../../contexts/MyContext";
import Styles from "../../../styles/Styles";
import S from "./Styles";

const Register = () => {
    const fields = [
        { field: "first_name", title: "Tên", icon: "account" },
        { field: "last_name", title: "Họ và tên lót", icon: "account" },
        { field: "email", title: "Email", icon: "email", keyboardType: "email-address" },
        { field: "username", title: "Tên đăng nhập", icon: "account" },
        { field: "password", title: "Mật khẩu", icon: "eye", secureTextEntry: true },
        { field: "confirm", title: "Xác nhận mật khẩu", icon: "eye", secureTextEntry: true },
    ];

    const [user, setUser] = useState({ role: "patient" });
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const nav = useNavigation();
    const dispatch = useContext(MyDispatchContext);

    const pickAvatar = async () => {
        const { status } = await ImgPicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { alert("Cần quyền truy cập thư viện ảnh!"); return; }
        const result = await ImgPicker.launchImageLibraryAsync({
            mediaTypes: ImgPicker.MediaType ? [ImgPicker.MediaType.Images] : ImgPicker.MediaTypeOptions.Images,
            quality: 0.7,
        });
        if (!result.canceled) setUser({ ...user, avatar: result.assets[0] });
    };

    const validate = () => {
        if (!user.first_name) { setErr("Vui lòng nhập tên!"); return false; }
        if (!user.username)   { setErr("Vui lòng nhập tên đăng nhập!"); return false; }
        if (!user.email)      { setErr("Vui lòng nhập email!"); return false; }
        if (!user.password || !user.confirm) { setErr("Vui lòng nhập mật khẩu!"); return false; }
        if (user.password !== user.confirm)  { setErr("Mật khẩu không khớp!"); return false; }
        return true;
    };

    const register = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            setErr(null);

            const form = new FormData();
            for (const key of Object.keys(user)) {
                if (key === "confirm") continue;
                if (key === "avatar") {
                    form.append("avatar", {
                        uri: user.avatar.uri,
                        name: user.avatar.fileName || "avatar.jpg",
                        type: "image/jpeg",
                    });
                } else {
                    form.append(key, user[key]);
                }
            }
            form.append("password_confirm", user.confirm);

            await Apis.post(endpoints["register"], form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const loginRes = await Apis.post(endpoints["login"], {
                username: user.username.trim(),
                password: user.password.trim(),
            });
            await AsyncStorage.setItem("token", loginRes.data.access_token);
            const currentUser = await authApis(loginRes.data.access_token).get(endpoints["current-user"]);
            dispatch({ type: "login", payload: { ...currentUser.data, token: loginRes.data.access_token } });

        } catch (ex) {
            console.error(ex?.response?.data || ex);
            const msg =
                ex?.response?.data?.username?.[0] ||
                ex?.response?.data?.email?.[0] ||
                ex?.response?.data?.password?.[0] ||
                ex?.response?.data?.detail ||
                "Đăng ký thất bại. Vui lòng thử lại!";
            setErr(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={Styles.container}>
            <View style={[Styles.padding, S.form]}>
                <Text style={Styles.title}>Tạo tài khoản</Text>

                <HelperText type="error" visible={!!err} style={Styles.margin}>
                    {err}
                </HelperText>

                {fields.map((f) => (
                    <TextInput
                        key={f.field}
                        label={f.title}
                        value={user[f.field] || ""}
                        onChangeText={(t) => setUser({ ...user, [f.field]: t })}
                        style={Styles.margin}
                        mode="outlined"
                        secureTextEntry={f.secureTextEntry && !showPass}
                        keyboardType={f.keyboardType || "default"}
                        right={
                            f.secureTextEntry
                                ? <TextInput.Icon icon={showPass ? "eye-off" : "eye"} onPress={() => setShowPass(!showPass)} />
                                : <TextInput.Icon icon={f.icon} />
                        }
                        outlineColor="#1565c0"
                        activeOutlineColor="#1565c0"
                    />
                ))}

                <TouchableOpacity onPress={pickAvatar} style={S.avatarPicker}>
                    <Text style={{ color: "#1565c0" }}>📷  Chọn ảnh đại diện...</Text>
                </TouchableOpacity>
                {user.avatar && (
                    <Image
                        source={{ uri: user.avatar.uri }}
                        style={[Styles.avatarLarge, Styles.margin, { alignSelf: "center" }]}
                    />
                )}

                <Button
                    mode="contained"
                    onPress={register}
                    loading={loading}
                    disabled={loading}
                    style={S.btn}
                    buttonColor="#1565c0"
                >
                    Đăng ký
                </Button>

                <Button mode="text" onPress={() => nav.navigate("login")} textColor="#1565c0">
                    Đã có tài khoản? Đăng nhập
                </Button>
            </View>
        </ScrollView>
    );
};

export default Register;
