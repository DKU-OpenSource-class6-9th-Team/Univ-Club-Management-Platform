from django.contrib.auth import get_user_model
from django.db import transaction
from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import Profile


User = get_user_model()


class SignUpSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    real_name = serializers.CharField(
        max_length=50,
        required=True,
        allow_blank=False
    )
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    school_name = serializers.CharField(max_length=100)
    department = serializers.CharField(max_length=100)
    student_id = serializers.CharField(max_length=30)
    nickname = serializers.CharField(max_length=50)
    phone_number = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )

    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("이미 사용 중인 아이디입니다.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "비밀번호가 일치하지 않습니다."
            })
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        username = validated_data.pop("username")
        real_name = validated_data.pop("real_name")
        password = validated_data.pop("password")
        validated_data.pop("password_confirm")

        email = validated_data.pop("email", "")

        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=real_name,
        )

        Profile.objects.create(
            user=user,
            role=Profile.ROLE_USER,
            **validated_data
        )

        return user
    
#User 생성 → Profile 생성 → 둘을 1:1로 연결

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        user = authenticate(username=username, password=password)

        if not user:
            raise serializers.ValidationError("아이디 또는 비밀번호가 올바르지 않습니다.")

        attrs["user"] = user
        return attrs
# username/password 받음 → Django authenticate로 계정 확인 → 맞으면 user 반환 → 틀리면 에러 반환

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    real_name = serializers.CharField(
        source='user.first_name',
        required=True,
        allow_blank=False
    )
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Profile
        fields = [
            'id',
            'user',
            'username',
            'real_name',
            'email',
            'school_name',
            'department',
            'student_id',
            'nickname',
            'phone_number',
            'role',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'user',
            'username',
            'email',
            'role',
            'created_at',
            'updated_at',
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})

        if 'first_name' in user_data:
            instance.user.first_name = user_data['first_name']
            instance.user.save(update_fields=['first_name'])

        return super().update(instance, validated_data)

class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)