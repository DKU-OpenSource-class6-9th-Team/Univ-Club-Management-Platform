# Contributing Guide

이 문서는 **Club Management Platform** 프로젝트의 협업 규칙과 기여 방법을 정리합니다.

프로젝트에 기능을 추가하거나 버그를 수정하거나 문서를 작성할 때는 아래 규칙을 따라 작업합니다.

---

## 1. 기본 원칙

* `main` 또는 `develop` 브랜치에 직접 push하지 않습니다.
* 모든 작업은 별도의 브랜치를 생성하여 진행합니다.
* 작업 브랜치는 Jira 이슈 번호를 포함하여 생성합니다.
* 작업 완료 후 Pull Request를 생성합니다.
* Pull Request의 대상 브랜치는 `develop`으로 설정합니다.
* 기능 작업과 문서 작업은 가능하면 별도의 PR로 분리합니다.

---


## 2. Branch Naming Convention

브랜치 이름은 작업 유형과 Jira 번호를 포함하여 작성합니다.


## 3. Pull Request Rule

Pull Request를 생성할 때는 다음 사항을 지킵니다.

* PR 대상 브랜치는 `develop`으로 설정합니다.
* PR 제목에는 Jira 번호와 작업 내용을 포함합니다.
* PR 설명에는 작업 내용, 변경 사항, 테스트 방법을 작성합니다.
* 기능 변경이 있는 경우 기존 기능에 영향이 없는지 확인합니다.


### PR 제목 예시

```txt
[KAN-72] 동아리 건강도 랭킹 연동
[KAN-73] 실제 동아리 데이터 기반 건강도 Notice 개선
```

---

## 4. 테스트 규칙

작업 완료 후 PR을 생성하기 전에 가능한 범위에서 테스트를 진행합니다.

### Backend 변경 시

```bash
python manage.py check
python manage.py migrate
python manage.py runserver
```

확인할 항목:

* Django 서버가 정상 실행되는지
* API 요청이 정상 응답하는지
* 기존 기능이 깨지지 않았는지
* DB 마이그레이션 문제가 없는지

### Frontend 변경 시

```bash
cd frontend
npm install
npm run dev
npm run build
```

확인할 항목:

* 페이지가 정상 렌더링되는지
* 기존 버튼과 페이지 이동이 정상 동작하는지
* 빌드 오류가 없는지

---

## 5. 파일 관리 규칙

아래 파일 또는 폴더는 GitHub에 업로드하지 않습니다.

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

---

## 6. 문서 작업 규칙

문서 작업은 `docs/` 브랜치에서 진행하는 것을 권장합니다.

문서 작업 시 확인할 항목:

* README 링크가 실제 파일과 연결되는지 확인합니다.
* `docs/` 폴더에 있는 문서명이 README의 링크와 일치하는지 확인합니다.
* 문서에는 실제 민감 정보나 비밀번호를 작성하지 않습니다.

---


## 7. 작업 전 확인 사항

새 작업을 시작하기 전에는 항상 최신 `develop` 브랜치를 기준으로 시작합니다.

```bash
git checkout develop
git pull origin develop
```

---
