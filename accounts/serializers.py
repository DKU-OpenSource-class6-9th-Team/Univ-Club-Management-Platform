from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import Profile


User = get_user_model()


class SignUpSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
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

    role = serializers.ChoiceField(
        choices=Profile.ROLE_CHOICES,
        default=Profile.ROLE_USER
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
        password = validated_data.pop("password")
        validated_data.pop("password_confirm")

        email = validated_data.pop("email", "")

        user = User.objects.create_user(
            username=validated_data["username"],
            password=password,
            email=email
        )

        validated_data.pop("username")

        Profile.objects.create(
            user=user,
            **validated_data
        )

        return user
    
#User 생성 → Profile 생성 → 둘을 1:1로 연결