# Backend Setup Guide

이 문서는 **Club Management Platform** 프로젝트의 Django 백엔드 실행 및 설정 방법을 설명합니다.

백엔드는 Python, Django, Django REST Framework, MySQL을 기반으로 동작합니다.

---

## 1. 백엔드 실행 전 준비사항

백엔드를 실행하기 전에 아래 프로그램이 설치되어 있어야 합니다.

* Python
* MySQL
* Git

---

## 2. 가상환경 생성

프로젝트 루트 디렉터리, 즉 `manage.py`가 있는 위치에서 가상환경을 생성합니다.

```bash
python -m venv venv
```

가상환경을 활성화합니다.

```bash
venv\Scripts\activate
```

---

## 3. Python 패키지 설치

가상환경이 활성화된 상태에서 필요한 Python 패키지를 설치합니다.

```bash
pip install -r requirements.txt
```

---

## 4. 환경변수 설정

백엔드 서버 실행을 위해 프로젝트 루트 디렉터리에 `.env` 파일을 생성해야 합니다.

`.env.example` 파일을 참고하여 `.env` 파일을 작성합니다.

```env
SECRET_KEY=your-django-secret-key
DEBUG=True

DB_NAME=club_management_db
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_HOST=localhost
DB_PORT=3306
```

---

## 5. MySQL 데이터베이스 준비

MySQL에 접속합니다.
프로젝트에서 사용할 데이터베이스를 생성합니다.
데이터베이스 설정에 대한 자세한 내용은 `docs/database-setup.md` 문서를 참고합니다.

---

## 6. Django 마이그레이션 실행

`.env` 설정과 MySQL 데이터베이스 생성이 완료되었다면 Django 마이그레이션을 실행합니다.

```bash
python manage.py migrate
```

마이그레이션이 성공하면 Django 기본 테이블과 프로젝트 앱에서 사용하는 테이블이 MySQL에 생성됩니다.

테이블 생성 여부는 MySQL에서 확인할 수 있습니다.

---

## 7. Django 서버 실행

마이그레이션이 완료되면 백엔드 서버를 실행합니다.

```bash
python manage.py runserver
```

서버가 정상적으로 실행되면 기본 주소는 다음과 같습니다.

```txt
http://127.0.0.1:8000/
```

브라우저에서 위 주소로 접속하여 서버가 정상적으로 실행되는지 확인합니다.

---

## 8. 백엔드 주요 앱 구조

백엔드는 여러 Django 앱으로 구성되어 있습니다.

```txt
accounts/       사용자 계정 및 프로필 관리
clubs/          동아리 정보, 만족도 조사, 건강도 분석 기능
club_members/   동아리 회원 관리
events/         일정, 신청, 출석 관리
fees/           회비, 납부, 거래, 증빙자료 관리
config/         Django 프로젝트 설정
```
---

## 9. 백엔드 작업 후 확인사항

* Django 설정 오류가 없는지 확인
* 서버가 정상적으로 실행되는지 확인
* 변경한 API가 정상 응답하는지 확인
* 기존 기능에 영향이 없는지 확인
* 마이그레이션 파일이 필요한 변경인지 확인

---

## 10. 자주 발생하는 문제

### 1. 가상환경 활성화가 되지 않는 경우

PowerShell 실행 정책 문제로 가상환경 활성화가 되지 않을 수 있습니다.

이 경우 PowerShell을 관리자 권한으로 실행한 뒤 다시 가상환경을 활성화합니다.

---

### 2. MySQL 연결 오류가 발생하는 경우

확인할 내용:

* MySQL 서버가 실행 중인지 확인
* DB 이름이 실제 생성된 이름과 일치하는지 확인
* DB 비밀번호가 올바른지 확인
* `.env` 파일이 `manage.py`와 같은 위치에 있는지 확인

---

### 3. 패키지 설치 오류가 발생하는 경우

가상환경이 활성화되어 있는지 확인합니다.

---

### 4. 마이그레이션 오류가 발생하는 경우

먼저 Django 설정 검사를 실행합니다.

```bash
python manage.py check
```

그 다음 마이그레이션을 다시 실행합니다.

```bash
python manage.py migrate
```

---
