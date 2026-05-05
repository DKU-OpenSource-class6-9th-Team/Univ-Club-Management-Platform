from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import SignUpSerializer, LoginSerializer


@api_view(['GET'])
def accounts_api_home(request):
    return Response({
        "message": "accounts API is connected"
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    serializer = SignUpSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        return Response(
            {
                "message": "회원가입이 완료되었습니다.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                }
            },
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# POST 요청 받음 → SignUpSerializer로 입력값 검사 → User 생성 → Profile 생성 → 성공하면 201 응답 → 실패하면 에러 응답
# 자동 로그인은 안한다. 회원가입 성공 후 로그인은 다음 로그인 Task에서 따로 처리함.

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.validated_data["user"]

        return Response(
            {
                "message": "로그인에 성공했습니다.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                }
            },
            status=status.HTTP_200_OK
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
# login api view 구현
