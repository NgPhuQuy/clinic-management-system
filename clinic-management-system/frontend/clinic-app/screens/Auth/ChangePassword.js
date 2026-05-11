import { View, ScrollView } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useState, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { authApis, endpoints } from "../../configs/Apis";
import { MyUserContext } from "../../contexts/MyContext";
import Styles from "../../styles/Styles";

const ChangePassword = () => {
    const user = useContext(MyUserContext);
    const nav = useNavigation();
    const [form, setForm] = useState({});
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(false);

    const save = async () => {
        if (!form.old_password || !form.new_password || !form.confirm) {
            setErr("Vui lòng điền đầy đủ thông tin!"); return;
        }
        if (form.new_password !== form.confirm) {
            setErr("Mật khẩu mới không khớp!"); return;
        }
        try {
            setLoading(true);
            setErr(null);
            await authApis(user.token).put(endpoints["change-password"], {
                old_password: form.old_password,
                new_password: form.new_password,
            });
            alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
            nav.goBack();
        } catch (e) {
            console.error(e);
            setErr("Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại!");
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { field: "old_password", label: "Mật khẩu hiện tại" },
        { field: "new_password", label: "Mật khẩu mới" },
        { field: "confirm", label: "Xác nhận mật khẩu mới" },
    ];

    return (
        <ScrollView style={Styles.container}>
            <View style={{ backgroundColor: "#fff", margin: 16, borderRadius: 16, elevation: 2, padding: 20 }}>
                <Text style={Styles.title}>Đổi mật khẩu</Text>
                <HelperText type="error" visible={!!err}>{err}</HelperText>
                {fields.map((f) => (
                    <TextInput
                        key={f.field}
                        label={f.label}
                        value={form[f.field] || ""}
                        onChangeText={(t) => setForm({ ...form, [f.field]: t })}
                        mode="outlined"
                        secureTextEntry
                        style={Styles.margin}
                        outlineColor="#1565c0"
                        activeOutlineColor="#1565c0"
                        right={<TextInput.Icon icon="eye" />}
                    />
                ))}
                <Button
                    mode="contained"
                    buttonColor="#1565c0"
                    onPress={save}
                    loading={loading}
                    disabled={loading}
                    style={{ borderRadius: 8 }}
                >
                    Lưu thay đổi
                </Button>
            </View>
        </ScrollView>
    );
};

export default ChangePassword;
