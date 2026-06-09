# Collaboration Rule

이 문서는 **Club Management Platform** 프로젝트의 팀 협업 규칙을 정리합니다.

프로젝트는 GitHub, Jira, Pull Request 기반으로 협업하며, 모든 작업은 이슈 단위로 나누어 진행합니다.

---

## 1. 협업 기본 원칙

프로젝트 협업 시 아래 원칙을 따릅니다.

* `main` 브랜치와 `develop` 브랜치에 직접 push하지 않습니다.
* 모든 작업은 별도 브랜치에서 진행합니다.
* 브랜치 이름에는 Jira 이슈 번호를 포함합니다.
* 작업 완료 후 Pull Request를 생성합니다.
* Pull Request 대상 브랜치는 `develop`으로 설정합니다.
* 기능 작업, 버그 수정, 문서 작업은 가능하면 별도 PR로 분리합니다.

---

## 2. 전체 작업 흐름

일반적인 작업 흐름은 다음과 같습니다.

```txt
1. Jira에서 작업 이슈 확인
2. develop 브랜치 최신화
3. 작업 브랜치 생성
4. 기능 구현 또는 문서 작성
5. 로컬 테스트
6. commit
7. 원격 브랜치 push
8. Pull Request 생성
9. develop 브랜치로 merge
```

---

## 3. Jira 사용 규칙

Jira는 작업 단위와 진행 상태를 관리하기 위해 사용합니다.

### 이슈 단위

작업은 가능한 한 하나의 기능 또는 하나의 목적 단위로 나눕니다.

예시:

```txt
KAN-72 동아리 건강도 랭킹 연동
KAN-73 실제 동아리 데이터 기반 건강도 Notice 개선
```

### 이슈 상태 관리

작업 상태는 실제 진행 상황에 맞게 변경합니다.

```txt
To Do       → 아직 시작하지 않은 작업
In Progress → 현재 진행 중인 작업
Done        → PR merge까지 완료된 작업
```

작업을 시작하면 Jira 이슈 상태를 `In Progress`로 변경하고, PR이 merge되면 `Done`으로 변경합니다.

---

## 4. 브랜치 생성 규칙

작업 브랜치는 항상 최신 `develop` 브랜치에서 생성합니다.

```bash
git checkout develop
git pull origin develop
git checkout -b KAN-번호-작업명
```

### 브랜치 이름 예시

```txt
KAN-72-club-health-ranking
KAN-73-health-notice-actual-data
KAN-80-login-error
```
---

## 5. Commit 규칙

커밋 메시지는 Jira 이슈 번호와 작업 내용을 포함합니다.

### 기본 형식

예시:

```txt
KAN-72 동아리 건강도 랭킹 연동
KAN-73 실제 동아리 데이터 기반 건강도 Notice 개선
```
---

## 6. Pull Request 규칙

작업이 완료되면 GitHub에서 Pull Request를 생성합니다.

### PR 기본 설정

```txt
base: develop
compare: 작업 브랜치
```

예시:

```txt
base: develop
compare: KAN-73-health-notice-actual-data
```

### PR 제목 예시

```txt
[KAN-72] 동아리 건강도 랭킹 연동
[KAN-73] 실제 동아리 데이터 기반 건강도 Notice 개선
```
---

## 7. 테스트 규칙

PR을 생성하기 전에 가능한 범위에서 테스트를 진행합니다.

### 백엔드 작업 시

```bash
python manage.py check
python manage.py runserver
```

DB 모델을 수정한 경우에는 마이그레이션도 확인합니다.

```bash
python manage.py makemigrations
python manage.py migrate
```

확인할 내용:

* Django 서버가 정상 실행되는지
* API 응답이 정상인지
* 기존 기능에 영향이 없는지
* 마이그레이션 오류가 없는지

### 프론트엔드 작업 시

```bash
cd frontend
npm run dev
npm run build
```

확인할 내용:

* 화면이 정상적으로 렌더링되는지
* 브라우저 콘솔 오류가 없는지
* 버튼, 링크, 페이지 이동이 정상 동작하는지
* 빌드 오류가 없는지

---

## 8. 리뷰 규칙

PR 리뷰 시에는 아래 내용을 확인합니다.

* 작업 목적에 맞는 변경인지
* 기존 기능에 영향을 주지 않는지
* 에러 처리 또는 예외 상황을 고려했는지
* README 또는 docs 수정이 필요한 작업인지
* PR 설명에 테스트 방법이 작성되어 있는지

수정이 필요한 경우에는 PR 댓글로 요청합니다.

---

## 9. 충돌 방지 규칙

여러 명이 동시에 작업할 때는 충돌을 줄이기 위해 아래 규칙을 지킵니다.

* 작업 시작 전 항상 `develop`을 최신화합니다.
* 큰 기능은 작은 단위로 나누어 PR을 생성합니다.
* 오래된 브랜치에서 계속 작업하지 않습니다.

작업 중인 브랜치가 오래되었다면 `develop`의 최신 변경사항을 반영합니다.

```bash
git checkout develop
git pull origin develop
git checkout 작업브랜치
git merge develop
```

충돌이 발생하면 충돌 파일을 수정한 뒤 다시 커밋합니다.

---

## 10. 파일 관리 규칙

아래 파일과 폴더는 GitHub에 업로드하지 않습니다.

```txt
.env
venv/
__pycache__/
*.pyc
db.sqlite3
frontend/node_modules/
frontend/dist/
media/
```

* `.env`에는 DB 비밀번호와 SECRET_KEY가 포함되므로 절대 업로드하지 않습니다.
* `venv/`는 로컬 가상환경이므로 업로드하지 않습니다.
* `frontend/node_modules/`는 npm 패키지 설치 결과물이므로 업로드하지 않습니다.
* `frontend/dist/`는 빌드 결과물이므로 업로드하지 않습니다.
* 업로드 파일이나 이미지가 저장되는 `media/` 폴더는 필요 여부를 확인한 뒤 관리합니다.

---

## 11. 문서 작업 규칙

문서 작업은 `docs/` 폴더에서 관리합니다.

문서 작업 시 확인할 내용:

* README의 문서 링크가 실제 파일과 연결되는지 확인합니다.
* 파일명과 링크 경로가 일치하는지 확인합니다.
* 실제 비밀번호나 SECRET_KEY를 작성하지 않습니다.
* 실행 명령어는 가능한 한 복사해서 사용할 수 있게 작성합니다.

---

## 12. PR 생성 전 체크리스트

PR을 만들기 전 확인합니다.

```txt
- git status 확인
- 불필요한 파일 포함 여부 확인
- .env 포함 여부 확인
- 백엔드 변경 시 python manage.py check 실행
- 프론트 변경 시 npm run build 실행
- README 또는 docs 수정 필요 여부 확인
- PR 설명에 작업 내용과 테스트 방법 작성
```

---
