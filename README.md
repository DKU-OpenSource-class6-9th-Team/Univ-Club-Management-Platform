동아리 홍보 및 모집을 통합 관리하는 플랫폼 계획 팀 프로젝트입니다.

<협업 규칙>
- 기능 구현 및 홈페이지 작업 시 main 브랜치에 직접 push하지 말아주세요.
- Jira Task 및 Story하위 Subtask의 번호(코드)를 포함한 branch를 생성하고 Pull Request 생성해주세요.

<사전 설치>
1. Git
2. Python(django 구동 언어)
3. MYSQL (Database)

<가상 환경 설정>
1. python -m venv venv (가상 환경 생성)
2. venv\Scripts\activate (활성화)
-> 이후 터미널에 (venv)가 같이 표시되면 됩니다.

<파이썬 패키지 일괄 설치 및 업데이트>
pip install -r requirements.txt
-> 해당 명령어를 통해 이전 사용자가 기능 구현에 필요한 패키지를 설치했을 경우 동일한 패키지를 설치할 수 있습니다.

pip freeze > requirements.txt
-> 동일하게 기능 구현 중 새로운 패키지를 설치했다면 PR하기 전에 꼭 해당 명령어를 통해 패키지 목록을 업데이트 해주세요.

<.env 파일 생성>
1. 해당 파일에는 데이터베이스의 기본 정보 및 패스워드가 들어갑니다. 따라서 github에 올리지 않도록 주의합니다.
2. .gitingnore 파일의 내용에 있는 파일들은 github에 업로드 되지 않습니다.
3. 따라서 사용자들은 .env_example 파일을 확인하여 개인 디렉터리(manage.py 존재하는 디렉터리)에 .env파일을 생성해야 합니다.


<MYSQL 초기 설정>
1. MYSQL의 데이터베이스 이름은 일단 club_management_db로 통일했습니다. 혹시 변경하고 싶으시면 꼭 알려주세요. 다만 데이터 베이스명을 통일해서 사용해야 협업과정 중 문제가 발생하지 않습니다.
2. .env파일에서 본인 database의 패스워드를 설정해주세요. 그래야 정상 실행 됩니다.
3. mysql -u root -p 로 데이터베이스 콘솔에 접속
4. CREATE DATABASE club_management_db CHARACTER SET utf8mb4; 를 통해 생성
5. SHOW DATABASES; 를 통해 생성 여부 확인
6. EXIT; 입력하면 종료됩니다.

<연결 확인>
1. python manage.py migrate 명령어를 통해 정상적으로 OK sign이 나오는지 확인합니다.
2. python manage.py runserver 를 통해 서버를 실행합니다. 이후 터미널에 나오는 메세지의 주소를 통해 접속하면 페이지가 정상적으로 나오게 됩니다.
3. 서버 종료 커맨드 -> "ctrl + c"

<mysql 테이블 생성 여부 확인>
1. mysql -u root -p
2. USE club_management_db;
3. SHOW TABLES;
    -> 이후 테이블 그룹이 보이면 됩니다.