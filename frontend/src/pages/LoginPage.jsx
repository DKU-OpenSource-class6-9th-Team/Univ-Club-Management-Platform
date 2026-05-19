import { useState } from 'react'; //비밀번호 보이기/숨기기 기능을 위해 사용
import { Link, useNavigate } from 'react-router-dom'; //a태그와 달라 새로고침 기능 없이 컴포넌트 이동
import { Eye, EyeOff, Lock, User } from 'lucide-react'; //페이지에 보이는 여러가지 아이콘 기능
import AuthLayout from '../components/AuthLayout.jsx';
import { login } from '../api/accounts.js';

function LoginPage() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false); //false면 숨기기, true면 보이기

  // 로그인 입력값 상태 관리
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  // 로그인 실패 메시지와 제출 상태 관리
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // input 값 변경 시 formData에 반영
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 로그인 버튼 클릭 시 Django 로그인 API로 요청
  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const data = await login({
        username: formData.username,
        password: formData.password,
      });

      // 이후 마이페이지 등에서 임시로 로그인 사용자 정보를 사용할 수 있도록 저장
      localStorage.setItem('loginUser', JSON.stringify(data.user));

      alert('로그인에 성공했습니다.');
      navigate('/main');
    } catch (error) {
      console.error(error);
      setErrorMessage('아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="로그인" subtitle="동아리 계정으로 로그인하세요">
      <form className="auth-commonform" onSubmit={handleSubmit}> {/*로그인 폼(블록)의 전체 영역*/}
        {/*아이디 입력 영역*/}
        <label className="form-label"> 
          <span>아이디</span>
          <div className="input-box">
            <User size={21} />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="아이디를 입력하세요"
              required
            />
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              required
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

        {/*로그인 실패 시 에러 메시지 출력*/}
        {errorMessage && (
          <p className="form-error-text">{errorMessage}</p>
        )}

        {/*로그인 버튼*/}
        <button
          type="submit"
          className="primary-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
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