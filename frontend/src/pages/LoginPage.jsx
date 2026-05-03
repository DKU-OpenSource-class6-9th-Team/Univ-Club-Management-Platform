import { useState } from 'react'; //비밀번호 보이기/숨기기 기능을 위해 사용
import { Link } from 'react-router-dom'; //a태그와 달라 새로고침 기능 없이 컴포넌트 이동
import { Eye, EyeOff, Lock, User } from 'lucide-react'; //페이지에 보이는 여러가지 아이콘 기능
import AuthLayout from '../components/AuthLayout.jsx';

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false); //false면 숨기기, true면 보이기

  return (
    <AuthLayout title="로그인" subtitle="내용 입력 1">
      <form className="auth-commonform"> {/*로그인 폼(블록)의 전체 영역*/}
        {/*아이디 입력 영역*/}
        <label className="form-label"> 
          <span>아이디</span>
          <div className="input-box">
            <User size={21} />
            <input type="text" placeholder="아이디를 입력하세요" />
          </div>
        </label>

        {/*비밀번호 입력 영역*/}
        <label className="form-label">
          <span>비밀번호</span>
          <div className="input-box">
            <Lock size={20} />

            {/*true/false에 따른 비밀번호 가리기 기능*/}
            <input
              type={showPassword ? 'text' : 'password'} 
              placeholder="비밀번호를 입력하세요"
            />

            {/*숨기기/보이기 버튼 기능
                ->클릭을 기준으로 on/off*/}
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label="비밀번호 표시 전환"
            >
              {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
            </button>
          </div>
        </label>


        {/*로그인 버튼
            */}
        <button type="button" className="primary-button">
          로그인
        </button>

        <div className="form-line-divider" /> {/*버튼 아래 구분선*/}

        <div className="form-bottom-links"> {/*구분선 아래 링크영역, a태그는 따로 페이지 이동*/}
          <a href="#">비밀번호 찾기</a>
          <Link to="/signup">회원가입</Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;