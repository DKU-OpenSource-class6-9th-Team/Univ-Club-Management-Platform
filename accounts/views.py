from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import Profile
from .serializers import SignUpSerializer, LoginSerializer, ProfileSerializer, DeleteAccountSerializer


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

        auth_login(request, user)

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

@api_view(['GET', 'PATCH'])
@permission_classes([AllowAny])
def profile_detail(request):
    if not request.user.is_authenticated:
        return Response(
            {
                "message": "로그인이 필요합니다."
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    profile = get_object_or_404(Profile, user=request.user)

    if request.method == 'GET':
        serializer = ProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    if request.method == 'PATCH':
        serializer = ProfileSerializer(profile, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "message": "프로필이 수정되었습니다.",
                    "profile": serializer.data,
                },
                status=status.HTTP_200_OK
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
#GET /api/accounts/profile/사용자ID/
#→ 해당 사용자의 Profile 정보 조회

#PATCH /api/accounts/profile/사용자ID/
#→ 해당 사용자의 Profile 정보 수정

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    auth_logout(request)

    return Response(
        {
            "message": "로그아웃되었습니다."
        },
        status=status.HTTP_200_OK
    )

@api_view(['GET'])
@permission_classes([AllowAny])
def current_user(request):
    if not request.user.is_authenticated:
        return Response(
            {
                "message": "로그인이 필요합니다."
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    profile = request.user.profile
    serializer = ProfileSerializer(profile)

    return Response(
        {
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
            },
            "profile": serializer.data,
        },
        status=status.HTTP_200_OK
    )

#GET /api/accounts/me/ → 현재 세션 기준으로 로그인한 사용자 정보 반환

#회원탈퇴
@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_account(request):
    if not request.user.is_authenticated:
        return Response(
            {
                "message": "로그인이 필요합니다."
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    serializer = DeleteAccountSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    password = serializer.validated_data["password"]

    if not request.user.check_password(password):
        return Response(
            {
                "password": "비밀번호가 올바르지 않습니다."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    user = request.user

    auth_logout(request)
    user.delete()

    return Response(
        {
            "message": "회원탈퇴가 완료되었습니다."
        },
        status=status.HTTP_200_OK
    )


@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token(request):
    return Response({
        "csrfToken": get_token(request)
    })
