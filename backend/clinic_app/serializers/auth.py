from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "username", "password", "password_confirm", "role", "avatar")

    def validate(self, data):
        if data["password"] != data.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Mật khẩu không khớp."})
        allowed_roles = ("patient", "doctor")
        if data.get("role") not in allowed_roles:
            raise serializers.ValidationError({"role": "Chỉ được đăng ký role patient hoặc doctor."})
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    doctor_info = serializers.SerializerMethodField()
    staff_info  = serializers.SerializerMethodField()
    avatar_url  = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "username", "first_name", "last_name",
            "role", "avatar", "avatar_url", "is_active", "push_token",
            "doctor_info", "staff_info",
        )
        read_only_fields = ("id", "is_active")

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        try:
            return obj.avatar.url
        except Exception:
            return str(obj.avatar) or None

    def get_doctor_info(self, obj):
        if obj.role != "doctor":
            return None
        try:
            d = obj.doctor_profile
            return {
                "id":               d.id,
                "specialty":        d.specialty.name if d.specialty else None,
                "license_number":   d.license_number,
                "experience_years": d.experience_years,
                "consultation_fee": str(d.consultation_fee),
                "is_available":     d.is_available,
            }
        except Exception:
            return None

    def get_staff_info(self, obj):
        if obj.role not in ("staff", "admin"):
            return None
        try:
            s = obj.staff_profile
            return {
                "id":               s.id,
                "position":         s.position,
                "position_display": s.get_position_display(),
                "department":       s.department.name if s.department else None,
                "phone":            s.phone,
                "employee_id":      s.employee_id,
            }
        except Exception:
            return None


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mật khẩu cũ không đúng.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user
