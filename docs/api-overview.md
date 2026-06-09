# API Overview

이 문서는 **Club Management Platform** 프로젝트에서 사용하는 주요 백엔드 API 구조를 설명합니다.

백엔드는 Django REST Framework를 기반으로 구성되어 있으며, 프론트엔드는 React에서 API 요청을 보내 사용자, 동아리, 회원, 회비, 일정, 건강도 분석 데이터를 사용합니다.

---

## 1. 기본 API 주소

대부분의 API는 `/api/` 경로 아래에 연결됩니다.

예시:

```txt
http://127.0.0.1:8000/api/accounts/login/
http://127.0.0.1:8000/api/clubs/
```

---

## 2. API 연결 구조

전체 API URL은 `config/urls.py`에서 각 앱의 `urls.py`로 연결됩니다.

```txt
/api/accounts/  → accounts.urls
/api/           → clubs.urls
/api/           → club_members.urls
/api/           → fees.urls
/api/           → events.urls
```

각 앱은 자신의 역할에 맞는 API 경로를 관리합니다.

| 앱             | 주요 역할                                                 |
| -------------- | ----------------------------------------------------------|
| `accounts`     | 회원가입, 로그인, 로그아웃, 사용자 정보, 프로필              |
| `clubs`        | 동아리 목록, 동아리 생성, 가입 신청, 건강도 분석, 만족도 조사 |
| `club_members` | 동아리 회원 관리, 가입 요청 승인/거절, 활동 점수, 네트워크    |
| `fees`         | 회비 요약, 수입/지출, 납부 현황, 증빙자료                    |
| `events`       | 일정 생성, 신청, 출석, 통계, 리포트                         |

---

## 3. Accounts API

사용자 계정과 프로필 관련 API입니다.

기본 경로:

```txt
/api/accounts/
```

| Method         | Endpoint                        | 설명                        |
| -------------- | ------------------------------- | ----------------------------|
| `GET`          | `/api/accounts/`                | 계정 API 기본 안내           |
| `GET`          | `/api/accounts/csrf/`           | CSRF 토큰 발급               |
| `POST`         | `/api/accounts/signup/`         | 회원가입                     |
| `POST`         | `/api/accounts/login/`          | 로그인                       |
| `POST`         | `/api/accounts/logout/`         | 로그아웃                     |
| `GET`          | `/api/accounts/me/`             | 현재 로그인한 사용자 정보 조회 |
| `GET`, `PATCH` | `/api/accounts/profile/`        | 사용자 프로필 조회 및 수정     |
| `DELETE`       | `/api/accounts/delete-account/` | 회원 탈퇴                     |

### 주요 사용 예시

#### 현재 로그인 사용자 조회

```txt
GET /api/accounts/me/
```
로그인한 사용자의 기본 정보와 프로필 정보를 확인할 때 사용합니다.

#### 프로필 조회 및 수정

```txt
GET /api/accounts/profile/
PATCH /api/accounts/profile/
```

사용자의 이름, 역할, 프로필 정보를 조회하거나 수정할 때 사용합니다.

---

## 5. Clubs API

동아리 정보, 가입 신청, 건강도 분석, 만족도 조사 관련 API입니다.

기본 경로:

```txt
/api/clubs/
```

`clubs` API는 Django REST Framework의 ViewSet 기반으로 구성되어 있습니다.

| Method         | Endpoint                       | 설명                                  |
| -------------- | ------------------------------ | --------------------------------------|
| `GET`          | `/api/clubs/`                  | 전체 동아리 목록 조회                  |
| `POST`         | `/api/clubs/`                  | 동아리 생성                           |
| `GET`          | `/api/clubs/{club_id}/`        | 특정 동아리 상세 조회                  |
| `PUT`, `PATCH` | `/api/clubs/{club_id}/`        | 특정 동아리 정보 수정                  |
| `DELETE`       | `/api/clubs/{club_id}/`        | 특정 동아리 삭제                       |
| `GET`          | `/api/clubs/my/`               | 현재 로그인 사용자의 내 동아리 목록 조회 |
| `POST`         | `/api/clubs/{club_id}/join/`   | 동아리 가입 신청                       |
| `GET`          | `/api/clubs/{club_id}/health/` | 동아리 건강도 분석 조회                 |
| `GET`          | `/api/clubs/health-ranking/`   | 동아리 건강도 랭킹 조회                 |

### 주요 사용 예시

#### 전체 동아리 목록 조회

```txt
GET /api/clubs/
```

메인 페이지에서 전체 동아리 목록을 표시할 때 사용합니다.

#### 내 동아리 목록 조회

```txt
GET /api/clubs/my/
```

현재 로그인한 사용자가 가입했거나 관리 중인 동아리 목록을 조회할 때 사용합니다.

#### 동아리 가입 신청

```txt
POST /api/clubs/{club_id}/join/
```

사용자가 특정 동아리에 가입 신청할 때 사용합니다.

#### 건강도 분석 조회

```txt
GET /api/clubs/{club_id}/health/
```

특정 동아리의 건강도 분석 결과를 조회할 때 사용합니다.

응답 데이터에는 일반적으로 다음과 같은 정보가 포함됩니다.

```txt
- 전체 건강도 점수
- 회원 활동성 지표
- 활동/일정 운영성 지표
- 재정 운영 투명성 지표
- 만족도 지표
- 동아리별 지표 비교 Notice
- 최종 코멘트
```

#### 건강도 랭킹 조회

```txt
GET /api/clubs/health-ranking/
```

전체 동아리의 건강도 점수를 기준으로 랭킹을 조회할 때 사용합니다.

메인 페이지의 동아리 건강도 랭킹 영역에서 사용됩니다.

---

## 6. Survey API

동아리 만족도 조사 관련 API입니다.

기본적으로 `clubs` API의 하위 action으로 관리됩니다.

| Method | Endpoint                                | 설명                     |
| ------ | --------------------------------------- | -------------------------|
| `GET`  | `/api/clubs/{club_id}/surveys/monthly/` | 월간 만족도 조사 항목 조회 |
| `POST` | `/api/clubs/{club_id}/surveys/items/`   | 만족도 조사 항목 저장      |
| `POST` | `/api/clubs/{club_id}/surveys/draft/`   | 만족도 조사 임시 저장      |
| `POST` | `/api/clubs/{club_id}/surveys/submit/`  | 만족도 조사 제출           |
| `GET`  | `/api/clubs/{club_id}/surveys/results/` | 만족도 조사 결과 분석 조회  |

### 주요 사용 예시

#### 만족도 조사 항목 조회

```txt
GET /api/clubs/{club_id}/surveys/monthly/
```

일정과 회비 항목을 기반으로 만족도 조사 항목을 조회합니다.

#### 만족도 조사 제출

```txt
POST /api/clubs/{club_id}/surveys/submit/
```

사용자가 각 항목에 대한 만족도 답변을 제출할 때 사용합니다.

#### 만족도 조사 결과 조회

```txt
GET /api/clubs/{club_id}/surveys/results/
```

동아리 운영진이 만족도 조사 결과를 확인할 때 사용합니다.

---

## 7. Club Members API

동아리 회원, 가입 요청, 활동 점수, 참여 네트워크 관련 API입니다.

기본 경로:

```txt
/api/clubs/{club_id}/members/
```

| Method                   | Endpoint                                                              | 설명                         |
| ------------------------ | --------------------------------------------------------------------- | -----------------------------|
| `GET`                    | `/api/clubs/{club_id}/members/`                                       | 동아리 회원 목록 조회          |
| `GET`                    | `/api/clubs/{club_id}/join-requests/`                                 | 동아리 가입 요청 목록 조회     |
| `POST`                   | `/api/clubs/{club_id}/join-requests/{membership_id}/approve/`         | 가입 요청 승인                |
| `POST`                   | `/api/clubs/{club_id}/join-requests/{membership_id}/reject/`          | 가입 요청 거절                |
| `POST`                   | `/api/clubs/{club_id}/members/activity-scores/sync/`                  | 회원 활동 점수 동기화          |
| `GET`                    | `/api/clubs/{club_id}/members/network/`                               | 회원 참여 네트워크 조회        |
| `POST`                   | `/api/clubs/{club_id}/members/network/observations/`                  | 회원 관계 관찰 기록 생성       |
| `GET`, `PATCH`, `DELETE` | `/api/clubs/{club_id}/members/network/observations/{observation_id}/` | 회원 관계 관찰 기록 상세 처리   |
| `GET`                    | `/api/clubs/{club_id}/members/network/{membership_id}/`               | 특정 회원의 네트워크 상세 조회  |
| `GET`, `PATCH`           | `/api/clubs/{club_id}/members/{membership_id}/`                       | 특정 회원 정보 조회 및 수정     |
 
### 주요 사용 예시

#### 활동 점수 동기화

```txt
POST /api/clubs/{club_id}/members/activity-scores/sync/
```

일정 출석, 활동 기록 등을 바탕으로 회원 활동 점수를 동기화할 때 사용합니다.

---

## 8. Fees API

동아리 회비, 납부, 거래, 증빙자료 관련 API입니다.

| Method                   | Endpoint                                           | 설명                          |
| ------------------------ | -------------------------------------------------- | ------------------------------|
| `GET`                    | `/api/clubs/{club_id}/fees/summary/`               | 회비 요약 정보 조회            |
| `GET`, `POST`            | `/api/clubs/{club_id}/fees/transactions/`          | 회비 거래 내역 조회 및 생성     |
| `GET`                    | `/api/fees/receipts/{receipt_id}/file/`            | 회비 증빙자료 파일 조회         |
| `GET`, `POST`            | `/api/clubs/{club_id}/fees/payments/`              | 회비 납부 목록 조회 및 생성     |
| `GET`, `PATCH`, `DELETE` | `/api/clubs/{club_id}/fees/payments/{payment_id}/` | 회비 납부 상세 조회, 수정, 삭제 |

### 주요 사용 예시

#### 회비 요약 조회

```txt
GET /api/clubs/{club_id}/fees/summary/
```

동아리의 회비 잔액, 수입, 지출 등 요약 정보를 조회할 때 사용합니다.

#### 회비 거래 내역 조회

```txt
GET /api/clubs/{club_id}/fees/transactions/
```

회비 수입/지출 내역을 조회할 때 사용합니다.

#### 회비 납부 현황 조회

```txt
GET /api/clubs/{club_id}/fees/payments/
```

동아리 회원들의 회비 납부 현황을 조회할 때 사용합니다.

---

## 9. Events API

동아리 일정, 신청, 출석, 통계 관련 API입니다.

| Method                   | Endpoint                                                     | 설명                         |
| ------------------------ | ------------------------------------------------------------ | -----------------------------|
| `GET`, `POST`            | `/api/clubs/{club_id}/events/`                               | 일정 목록 조회 및 생성        |
| `GET`                    | `/api/clubs/{club_id}/events/my-role/`                       | 현재 사용자의 일정 관련 조회   |
| `GET`                    | `/api/clubs/{club_id}/events/member-activity/`               | 회원 활동 요약 조회           |
| `GET`                    | `/api/clubs/{club_id}/events/member-activity/{user_id}/`     | 특정 회원 활동 상세 조회       |
| `GET`                    | `/api/clubs/{club_id}/events/low-participation/`             | 참여율이 낮은 회원 목록 조회   |
| `GET`                    | `/api/clubs/{club_id}/events/operation-stats/`               | 일정 운영 통계 조회           |
| `POST`                   | `/api/clubs/{club_id}/events/recurring/`                     | 반복 일정 생성                |
| `GET`                    | `/api/clubs/{club_id}/events/timeline/`                      | 일정 타임라인 조회            |
| `GET`, `PATCH`, `DELETE` | `/api/clubs/{club_id}/events/{event_id}/`                    | 일정 상세 조회, 수정, 삭제    |
| `POST`                   | `/api/clubs/{club_id}/events/{event_id}/apply/`              | 일정 신청                    |
| `POST`                   | `/api/clubs/{club_id}/events/{event_id}/cancel-application/` | 일정 신청 취소               |
| `GET`                    | `/api/clubs/{club_id}/events/{event_id}/my-application/`     | 내 일정 신청 상태 조회        |
| `GET`                    | `/api/clubs/{club_id}/events/{event_id}/applications/`       | 일정 신청자 목록 조회         |
| `GET`                    | `/api/clubs/{club_id}/events/{event_id}/attendances/`        | 일정 출석 목록 조회           |
| `POST`                   | `/api/clubs/{club_id}/events/{event_id}/attendances/check/`  | 일정 출석 체크                |
| `GET`                    | `/api/clubs/{club_id}/events/{event_id}/stats/`              | 일정별 통계 조회              |
| `GET`                    | `/api/clubs/{club_id}/events/{event_id}/no-shows/`           | 일정 노쇼 회원 목록 조회       |
| `GET`                    | `/api/clubs/{club_id}/events/{event_id}/report/`             | 일정 리포트 조회              |

### 주요 사용 예시

#### 일정 목록 조회

```txt
GET /api/clubs/{club_id}/events/
```

특정 동아리의 일정 목록을 조회할 때 사용합니다.

#### 일정 생성

```txt
POST /api/clubs/{club_id}/events/
```

동아리 운영진이 새로운 일정을 생성할 때 사용합니다.

#### 일정 신청

```txt
POST /api/clubs/{club_id}/events/{event_id}/apply/
```

회원이 특정 일정에 신청할 때 사용합니다.

#### 출석 체크

```txt
POST /api/clubs/{club_id}/events/{event_id}/attendances/check/
```

운영진이 일정 참여자의 출석 상태를 기록할 때 사용합니다.

---

## 10. 응답 형식

대부분의 API는 JSON 형식으로 응답합니다.

예시:

```json
{
  "id": 1,
  "name": "Example Club",
  "category": "academic"
}
```

오류가 발생한 경우에도 일반적으로 JSON 형식의 메시지를 반환합니다.

예시:

```json
{
  "message": "로그인이 필요합니다."
}
```
---

## 13. 관련 문서

* [Backend Setup Guide](./backend-setup.md)
* [Frontend Setup Guide](./frontend-setup.md)
* [Database Setup Guide](./database-setup.md)
* [Project Structure](./project-structure.md)
* [Health Analysis](./health-analysis.md)
