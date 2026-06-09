# Database Setup Guide

이 문서는 **Club Management Platform** 프로젝트의 MySQL 데이터베이스 설정 방법을 설명합니다.

이 프로젝트는 Django 백엔드와 MySQL 데이터베이스를 연결하여 사용자, 동아리, 회원, 회비, 일정, 만족도, 건강도 분석 관련 데이터를 저장합니다.

---

## 1. 데이터베이스 설정 전 준비사항

데이터베이스 설정을 진행하기 전에 아래 항목이 준비되어 있어야 합니다.

* MySQL 설치
* MySQL root 계정 또는 데이터베이스 생성 권한이 있는 계정
* Python 가상환경 설정
* `requirements.txt` 패키지 설치
* 프로젝트 루트에 `.env` 파일 생성

---

## 2. MySQL 접속

터미널 또는 PowerShell에서 MySQL에 접속합니다.

```bash
mysql -u root -p
```

명령어 실행 후 MySQL 비밀번호를 입력합니다.

---

## 3. 데이터베이스 생성

프로젝트에서 사용할 데이터베이스를 생성합니다.

```sql
CREATE DATABASE club_management_db CHARACTER SET utf8mb4;
```

`utf8mb4`는 한글, 이모지, 특수문자 등을 안정적으로 저장하기 위한 문자셋입니다.

데이터베이스가 정상적으로 생성되었는지 확인합니다.

```sql
SHOW DATABASES;
```

목록에 `club_management_db`가 보이면 정상적으로 생성된 것입니다.

---

## 4. Django 패키지 설치 확인

Django가 MySQL에 연결하려면 `mysqlclient` 패키지가 필요합니다.

가상환경을 활성화한 뒤 패키지를 설치합니다.

```bash
pip install -r requirements.txt
```
---

## 5. 마이그레이션 실행

데이터베이스 생성과 `.env` 설정이 완료되면 Django 마이그레이션을 실행합니다.

```bash
python manage.py migrate
```

이 명령어는 Django 모델 정보를 바탕으로 MySQL에 필요한 테이블을 생성합니다.

정상적으로 완료되면 `auth_user`, `accounts_profile`, `clubs_club` 등 프로젝트에서 사용하는 테이블들이 생성됩니다.

---

## 6. 테이블 생성 확인

MySQL에 다시 접속합니다.

```bash
mysql -u root -p
```

프로젝트 데이터베이스를 선택합니다.

```sql
USE club_management_db;
```

생성된 테이블 목록을 확인합니다.

```sql
SHOW TABLES;
```
---

## 7. 데이터베이스 관련 주요 명령어 정리

### MySQL 접속

```bash
mysql -u root -p
```

### 데이터베이스 생성

```sql
CREATE DATABASE club_management_db CHARACTER SET utf8mb4;
```

### 데이터베이스 목록 확인

```sql
SHOW DATABASES;
```

### 사용할 데이터베이스 선택

```sql
USE club_management_db;
```

### 테이블 목록 확인

```sql
SHOW TABLES;
```

### Django 마이그레이션 실행

```bash
python manage.py migrate
```
---

## 8. 데이터베이스 작업 시 주의사항

* 데이터베이스 이름을 변경했다면 `.env`의 `DB_NAME`도 함께 수정해야 합니다.
* 모델을 수정한 경우 `makemigrations`와 `migrate`를 실행해야 합니다.
* 마이그레이션 파일이 생성되었다면 필요한 변경인지 확인한 뒤 커밋합니다.

---
