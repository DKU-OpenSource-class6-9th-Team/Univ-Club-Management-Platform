# Project Structure

이 문서는 **Club Management Platform** 프로젝트의 주요 폴더 구조와 각 디렉터리의 역할을 설명합니다.

---

## 1. 전체 프로젝트 구조

```txt
Univ-Club-Management-Platform/
├── README.md
├── LICENSE
├── .env.example
├── CONTRIBUTING.md
├── requirements.txt
├── manage.py
├── config/
├── accounts/
├── applications/
├── clubs/
├── recruitments/
├── club_members/
├── events/
├── fees/
├── frontend/
└── docs/
```

각 폴더는 역할별로 분리되어 있으며, 백엔드는 Django 앱 단위로 기능이 나뉘어 있습니다.

---

## 2. Django 설정 폴더: `config/`

```txt
config/
├── settings.py
├── urls.py
├── asgi.py
└── wsgi.py
```

`config/` 폴더는 Django 프로젝트의 전역 설정을 담당합니다.

### 주요 파일

| 파일          | 역할                                                    |
| ------------- | --------------------------------------------------------|
| `settings.py` | Django 앱 등록, DB 연결, CORS, 정적 파일, 미디어 파일 설정 |
| `urls.py`     | 전체 API URL 연결                                        |
| `asgi.py`     | ASGI 서버 실행 설정                                      |
| `wsgi.py`     | WSGI 서버 실행 설정                                      |

### 주요 역할

* Django 앱 등록
* MySQL 데이터베이스 연결
* CORS/CSRF 설정
* API URL 라우팅
* 미디어 파일 제공 설정

---

## 3. 사용자 계정 앱: `accounts/`

```txt
accounts/
├── models.py
├── views.py
├── serializers.py
├── urls.py
├── admin.py
└── apps.py
```

`accounts/` 앱은 사용자 계정과 프로필 관련 기능을 담당합니다.

### 주요 기능

* 회원가입
* 로그인
* 로그아웃
* 현재 로그인 사용자 조회
* 사용자 프로필 조회 및 수정
* 회원 탈퇴
* 사용자 권한/역할 관리

### 관련 API 예시

```txt
/api/accounts/signup/
/api/accounts/login/
/api/accounts/logout/
/api/accounts/me/
/api/accounts/profile/
/api/accounts/delete-account/
```

---

## 4. 동아리 앱: `clubs/`

```txt
clubs/
├── models.py
├── views.py
├── serializers.py
├── urls.py
├── admin.py
├── apps.py
├── services/
└── data/
```

`clubs/` 앱은 동아리 정보와 건강도 분석 기능을 담당하는 핵심 앱입니다.

### 주요 기능

* 동아리 목록 조회
* 동아리 생성 및 관리
* 내가 가입한 동아리 조회
* 동아리 가입 신청
* 동아리 건강도 분석
* 건강도 랭킹
* 만족도 조사 관련 데이터 처리
* 동아리별 지표 비교 Notice 생성

### 주요 하위 폴더

| 폴더        | 역할                                            |
| ----------- | ------------------------------------------------|
| `services/` | 건강도 분석, Notice 생성 등 로직                  |
| `data/`     | 건강도 분석에 사용되는 기준 데이터 또는 학습 데이터 |

### 관련 API 예시

```txt
/api/clubs/
/api/clubs/my-clubs/
/api/clubs/{club_id}/join/
/api/clubs/{club_id}/health/
/api/clubs/health-ranking/
```

---

## 5. 동아리 회원 앱: `club_members/`

```txt
club_members/
├── models.py
├── views.py
├── serializers.py
├── urls.py
├── admin.py
└── apps.py
```

`club_members/` 앱은 동아리 회원과 가입 요청 관리를 담당합니다.

### 주요 기능

* 동아리 회원 목록 조회
* 가입 요청 목록 조회
* 가입 요청 승인
* 가입 요청 거절
* 회원 상태 수정
* 회원 활동 점수 동기화
* 회원 참여 네트워크 관리

### 관련 API 예시

```txt
/api/clubs/{club_id}/members/
/api/clubs/{club_id}/join-requests/
/api/clubs/{club_id}/join-requests/{membership_id}/approve/
/api/clubs/{club_id}/join-requests/{membership_id}/reject/
/api/clubs/{club_id}/members/activity-scores/sync/
/api/clubs/{club_id}/members/network/
```

---

## 6. 일정 앱: `events/`

```txt
events/
├── models.py
├── views.py
├── serializers.py
├── urls.py
├── admin.py
└── apps.py
```

`events/` 앱은 동아리 일정, 신청, 출석, 통계 기능을 담당합니다.

### 주요 기능

* 일정 생성 및 조회
* 일정 상세 조회 및 수정
* 반복 일정 생성
* 일정 신청
* 일정 신청 취소
* 일정 신청자 목록 조회
* 출석 체크
* 출석 목록 조회
* 일정 통계 조회
* 노쇼 회원 조회
* 활동 리포트 조회

### 관련 API 예시

```txt
/api/clubs/{club_id}/events/
/api/clubs/{club_id}/events/{event_id}/
/api/clubs/{club_id}/events/{event_id}/apply/
/api/clubs/{club_id}/events/{event_id}/cancel-application/
/api/clubs/{club_id}/events/{event_id}/attendances/
/api/clubs/{club_id}/events/{event_id}/attendances/check/
/api/clubs/{club_id}/events/{event_id}/stats/
/api/clubs/{club_id}/events/{event_id}/report/
```

---

## 7. 회비 앱: `fees/`

```txt
fees/
├── models.py
├── views.py
├── serializers.py
├── urls.py
├── admin.py
└── apps.py
```

`fees/` 앱은 동아리 회비 관리 기능을 담당합니다.

### 주요 기능

* 회비 요약 정보 조회
* 회비 수입/지출 거래 내역 관리
* 회비 납부 현황 관리
* 납부 상세 조회 및 수정
* 증빙자료 파일 조회

### 관련 API 예시

```txt
/api/clubs/{club_id}/fees/summary/
/api/clubs/{club_id}/fees/transactions/
/api/clubs/{club_id}/fees/payments/
/api/clubs/{club_id}/fees/payments/{payment_id}/
/api/fees/receipts/{receipt_id}/file/
```

---

## 8. 모집/지원 관련 앱: `applications/`, `recruitments/`

```txt
applications/
recruitments/
```

`applications/`와 `recruitments/`는 동아리 모집 및 지원 기능과 관련된 앱입니다.

프로젝트의 기능 확장 과정에서 동아리 모집 공고, 지원서, 지원 상태 관리 등의 기능을 담당할 수 있습니다.

### 예상 역할

| 앱              | 역할                            |
| --------------- | --------------------------------|
| `applications/` | 동아리 지원 또는 신청 데이터 관리  |
| `recruitments/` | 동아리 모집 공고 및 모집 상태 관리 |

현재 사용 중인 기능 범위에 따라 실제 역할은 변경될 수 있습니다.

---

## 9. 프론트엔드 폴더: `frontend/`

```txt
frontend/
├── public/
├── src/
├── package.json
├── vite.config.js
└── index.html
```

`frontend/` 폴더는 React 기반 프론트엔드 코드를 포함합니다.

### 주요 역할

* 사용자 화면 구성
* 페이지 라우팅
* 백엔드 API 호출
* 로그인/회원가입 화면
* 메인 페이지
* 동아리 상세 및 대시보드 화면
* 회원, 회비, 일정, 건강도 분석 화면

### 주요 하위 구조 예시

```txt
frontend/src/
├── api/
├── components/
├── pages/
├── App.jsx
└── main.jsx
```

| 폴더/파일         | 역할                      |
| ----------------- | --------------------------|
| `src/api/`        | 백엔드 API 호출 함수       |
| `src/components/` | 재사용 가능한 UI 컴포넌트   |
| `src/pages/`      | 페이지 단위 컴포넌트        |
| `App.jsx`         | 전체 라우팅 및 앱 구조      |
| `main.jsx`        | React 앱 진입점            |
| `package.json`    | npm 패키지 및 실행 스크립트 |

---

## 10. 주요 데이터 흐름

프로젝트의 기본 데이터 흐름은 다음과 같습니다.

```txt
React Frontend
      ↓
Django REST API
      ↓
Django Models
      ↓
MySQL Database
```

예를 들어 사용자가 프론트엔드에서 동아리 목록을 조회하면 다음과 같은 흐름으로 처리됩니다.

```txt
메인 페이지
→ frontend/src/api 호출
→ Django API 요청
→ clubs 앱의 View/ViewSet 처리
→ MySQL 데이터 조회
→ JSON 응답 반환
→ React 화면 렌더링
```

---

## 11. API 연결 구조

전체 API URL은 `config/urls.py`에서 각 앱의 URL 파일로 연결됩니다.

```txt
config/urls.py
├── /api/accounts/  → accounts.urls
├── /api/           → clubs.urls
├── /api/           → club_members.urls
├── /api/           → fees.urls
└── /api/           → events.urls
```

각 앱은 자신의 `urls.py`에서 상세 API 경로를 관리합니다.

---

## 12. 파일 추가 시 기준

새로운 기능을 추가할 때는 기능의 성격에 맞는 앱에 파일을 추가합니다.

| 작업 내용                  | 위치                                                  |
| ---------------------------| ------------------------------------------------------|
| 사용자 계정/프로필 관련 기능 | `accounts/`                                           |
| 동아리 정보/건강도 분석 기능 | `clubs/`                                              |
| 동아리 회원/가입 요청 기능   | `club_members/`                                       |
| 일정/출석 기능              | `events/`                                             |
| 회비/납부/증빙자료 기능      | `fees/`                                               |
| 프론트엔드 화면 기능         | `frontend/src/pages/` 또는 `frontend/src/components/` |
| API 호출 함수               | `frontend/src/api/`                                   |
| 프로젝트 문서                | `docs/`                                              |

---
