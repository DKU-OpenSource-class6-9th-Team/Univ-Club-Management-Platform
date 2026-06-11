# Club Management Platform

대학교 동아리 운영, 회원, 회비, 일정, 만족도 및 건강도 분석을 통합적으로 관리하기 위한 웹 플랫폼입니다.

이 프로젝트는 동아리 운영진과 일반 사용자가 하나의 플랫폼에서 동아리 정보를 확인하고, 가입 신청, 회원 관리, 회비 관리, 일정 관리, 만족도 조사, 건강도 분석 등을 수행할 수 있도록 개발되었습니다.

---

## 주요 기능

### 사용자 기능

- 회원가입 및 로그인, 회원 탈퇴
- 전체 동아리 목록 조회
- 동아리 생성
- 동아리 가입 신청
- 내가 가입한 동아리 조회
- 동아리별 대시보드 이동

### 동아리 운영 기능

- 동아리 정보 등록
- 동아리 회원 관리
- 회원 상태 및 활동 점수 관리
- 회비 납부 현황 관리
- 회비 수입/지출 내역 관리
- 증빙자료 관리
- 일정 생성 및 관리
- 일정 신청 및 출석 관리
- 만족도 조사 관리

### 건강도 분석 기능

- 동아리 전체 건강도 점수 산정
- 회원 활동성 분석
- 활동/일정 운영성 분석
- 재정 운영 투명성 분석
- 만족도 기반 지표 분석
- 동아리별 지표 비교 Notice 제공
- 동아리 건강도 랭킹 제공(메인페이지)

---

## 기술 스택

### Frontend

- React
- Vite
- React Router
- JavaScript
- CSS
- lucide-react

### Backend

- Python
- Django
- Django REST Framework
- django-cors-headers
- python-dotenv

### Database

- MySQL

### Data Analysis

- pandas
- scikit-learn(미사용)

### Collaboration

- Git
- GitHub
- Jira

---

## 프로젝트 구조

```txt
Univ-Club-Management-Platform/
├── README.md                     # 프로젝트 소개 및 실행 안내
├── LICENSE                       # 프로젝트 라이선스
├── .env.example                  # 환경변수 예시 파일
├── CONTRIBUTING.md               # 협업 및 기여 규칙
├── docs/                         # 프로젝트 상세 문서
│   ├── backend-setup.md          # 백엔드 실행 및 설정 방법
│   ├── frontend-setup.md         # 프론트엔드 실행 및 설정 방법
│   ├── database-setup.md         # MySQL 데이터베이스 설정 방법
│   ├── project-structure.md      # 프로젝트 폴더 구조 설명
│   ├── api-overview.md           # 주요 API 개요
│   ├── health-analysis.md        # 동아리 건강도 분석 기준
│   ├── collaboration-rule.md     # GitHub/Jira 협업 규칙
├── accounts/                     # 사용자 계정 및 프로필 관리
├── clubs/                        # 동아리, 만족도 조사, 건강도 분석 기능
├── club_members/                 # 동아리 회원 관리
├── events/                       # 일정, 신청, 출석 관리
├── fees/                         # 회비, 납부, 거래, 증빙자료 관리
├── config/                       # Django 프로젝트 설정
├── frontend/                     # React 프론트엔드
├── manage.py                     # Django 실행 파일
├── requirements.txt              # Python 패키지 목록
└── .gitignore                    # Git 추적 제외 파일 목록
```

---

## 빠른 실행 방법

### 1. 저장소 클론

```bash
git clone https://github.com/DKU-OpenSource-class6-9th-Team/Univ-Club-Management-Platform.git
cd Univ-Club-Management-Platform
```

### 2. 백엔드 실행

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

백엔드 서버는 기본적으로 아래 주소에서 실행됩니다.

```txt
http://127.0.0.1:8000/
```

### 3. 프론트엔드 실행

새 터미널을 열고 아래 명령어를 실행합니다.

```bash
cd frontend
npm install
npm run dev
```

프론트엔드 서버는 기본적으로 아래 주소에서 실행됩니다.

```txt
http://localhost:5173/
```

---

## 환경변수 설정

프로젝트 루트 디렉터리, 즉 `manage.py`가 있는 위치에 `.env` 파일을 생성해야 합니다.

`.env.example` 파일을 참고하여 본인 환경에 맞게 값을 입력합니다.

예시:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True

DB_NAME=club_management_db
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_HOST=localhost
DB_PORT=3306
```

주의사항:

- `.env` 파일은 GitHub에 업로드하지 않습니다.

---

## MySQL 설정

MySQL 콘솔에 접속합니다.

```bash
mysql -u root -p
```

데이터베이스를 생성합니다.

```sql
CREATE DATABASE club_management_db CHARACTER SET utf8mb4;
```

생성 여부를 확인합니다.

```sql
SHOW DATABASES;
```

MySQL 콘솔을 종료합니다.

```sql
EXIT;
```

마이그레이션 후 테이블 생성 여부를 확인하려면 아래 명령어를 사용합니다.

```bash
mysql -u root -p
```

```sql
USE club_management_db;
SHOW TABLES;
```

---

## 상세 문서

자세한 실행 방법과 프로젝트 구조는 `docs/` 폴더에서 확인할 수 있습니다.

| 문서 | 설명 |
|---|---|
| [Backend Setup](./docs/backend-setup.md) | Django 백엔드 실행 및 설정 방법 |
| [Frontend Setup](./docs/frontend-setup.md) | React 프론트엔드 실행 및 설정 방법 |
| [Database Setup](./docs/database-setup.md) | MySQL 데이터베이스 설정 방법 |
| [Project Structure](./docs/project-structure.md) | 프로젝트 폴더 구조 설명 |
| [API Overview](./docs/api-overview.md) | 주요 API 구조 및 역할 |
| [Health Analysis](./docs/health-analysis.md) | 동아리 건강도 분석 기준 |
| [Collaboration Rule](./docs/collaboration-rule.md) | GitHub/Jira 협업 규칙 |
| [Contributing Guide](./CONTRIBUTING.md) | 브랜치, 커밋, PR 작성 규칙 |

---

## 주요 페이지

| 페이지 | 설명 |
|---|---|
| 로그인 | 사용자 로그인 |
| 회원가입 | 사용자 계정 생성 |
| 메인 페이지 | 전체 동아리, 내 동아리, 일정, 건강도 랭킹 확인 |
| 동아리 등록 | 동아리 정보 등록 |
| 동아리 대시보드 | 동아리 운영 관리 |
| 회원 관리 | 동아리 회원 상태 및 활동 점수 관리 |
| 회비 관리 | 회비 납부, 수입/지출, 증빙자료 관리 |
| 일정 관리 | 동아리 일정 생성 및 출석 관리 |
| 만족도 조사 | 활동 및 회비 만족도 조사 |
| 건강도 분석 | 동아리 운영 건강도 분석 |

---

## 건강도 분석 개요

동아리 건강도는 플랫폼에 저장된 동아리 운영 데이터를 기반으로 계산됩니다.

주요 분석 영역은 다음과 같습니다.

- 회원 활동성
- 활동/일정 운영성
- 재정 운영 투명성
- 만족도 및 응답률
- 동아리별 지표 비교 Notice

동아리별 지표 비교 Notice는 합성 학습 데이터와 플랫폼에 등록된 실제 다른 동아리 데이터를 함께 참고하여 현재 동아리의 상대적으로 높은 지표와 낮은 지표를 안내합니다.

건강도 분석의 상세 기준은 [Health Analysis 문서](./docs/health-analysis.md)를 참고합니다.

---

## 협업 규칙

### Branch 규칙

`main` 또는 `develop` 브랜치에 직접 push하지 않습니다.

작업은 Jira 이슈 번호를 포함한 브랜치에서 진행합니다.

브랜치 이름 예시:

```txt
KAN-72-club-health-ranking
KAN-73-health-notice-actual-data
```

### Commit 메시지 규칙

커밋 메시지에는 Jira 이슈 번호와 작업 유형을 포함합니다.

예시:

```txt
[KAN-72] 동아리 건강도 랭킹 연동
[KAN-73] 실제 동아리 데이터 기반 건강도 Notice 개선
```

### Pull Request 규칙

- 작업 완료 후 Pull Request를 생성합니다.
- PR 대상 브랜치는 `develop`으로 설정합니다.
- PR 생성 시 작업 내용과 테스트 방법을 작성합니다.


협업 규칙의 상세 내용은 [Collaboration Rule 문서](./docs/collaboration-rule.md)를 참고합니다.

---

## 주의사항

- `.env` 파일은 절대 GitHub에 업로드하지 않습니다.
- `venv/` 폴더는 GitHub에 업로드하지 않습니다.
- `frontend/node_modules/` 폴더는 GitHub에 업로드하지 않습니다.
- DB 비밀번호, SECRET_KEY 등 민감한 정보는 코드에 직접 작성하지 않습니다.
- 새로운 Python 패키지를 설치한 경우 `requirements.txt`를 업데이트합니다.

---

## License

This project is licensed under the MIT License.

See the [LICENSE](./LICENSE) file for details.
