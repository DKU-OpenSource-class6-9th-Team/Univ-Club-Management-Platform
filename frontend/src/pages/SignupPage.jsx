import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Lock, User } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import { signup } from '../api/accounts.js';

const universityDomains = { //학교 이메일 도메인을 설정하고 이를 통해 선택 시 자동 표시
  단국대학교: 'dankook.ac.kr',
  경희대학교: 'khu.ac.kr',
};

function SignupPage() {
  const navigate = useNavigate();

  const [selectedUniversity, setSelectedUniversity] = useState('단국대학교'); //선택 기본 값
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordCheck, setShowPasswordCheck] = useState(false);

  // 회원가입 폼 입력값 상태 관리
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password_confirm: '',
    email_id: '',
    department: '',
    student_id: '',
    nickname: '',
    phone_number: '',
    role: 'USER',
  });

  // 회원가입 실패 메시지와 제출 상태 관리
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailDomain = universityDomains[selectedUniversity]; //선택된 학교의 이메일 도메인 가져옴

  // input 값 변경 시 formData에 반영
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 회원가입 버튼 클릭 시 Django 회원가입 API로 요청
  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setIsSubmitting(true);

    const signupData = {
      username: formData.username,
      password: formData.password,
      password_confirm: formData.password_confirm,
      email: `${formData.email_id}@${emailDomain}`,
      school_name: selectedUniversity,
      department: formData.department,
      student_id: formData.student_id,
      nickname: formData.nickname,
      phone_number: formData.phone_number,
      role: formData.role,
    };

    try {
      await signup(signupData);
      alert('회원가입이 완료되었습니다.');
      navigate('/login');
    } catch (error) {
      console.error(error);
      setErrorMessage('회원가입에 실패했습니다. 입력값을 다시 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="회원가입" subtitle="내용 입력 1">
      <form className="auth-commonform signup-form" onSubmit={handleSubmit}> {/*회원가입 폼의 전체적인 영역*/}
        <label className="form-label">
          <span>아이디</span>
          <div className="input-box">
            <User size={20} />
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

        <label className="form-label">
          <span>비밀번호</span>
          <div className="input-box">
            <Lock size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              required
            />

            {/*비밀번호 보이기/숨기기 버튼*/}
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

        {/*비밀번호 확인 입력 영역*/}
        <label className="form-label">
          <span>비밀번호 확인</span>
          <div className="input-box">
            <Lock size={20} />
            <input
              type={showPasswordCheck ? 'text' : 'password'}
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력하세요"
              required
            />

            {/*비밀번호 보이기/숨기기 버튼*/}
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowPasswordCheck((prev) => !prev)}
              aria-label="비밀번호 확인 표시 전환"
            >
              {showPasswordCheck ? <EyeOff size={21} /> : <Eye size={21} />}
            </button>
          </div>
        </label>

        {/*대학교 선택 영역*/}
        <label className="form-label">
          <span>대학교 선택</span>
          <div className="input-box">
            <Building2 size={20} />

            {/*value의 값은 selectedUniversity와 연결, 다른 학교 선택 시 onChange의 상태 변경
                select는 선택지들을 보여주는 인터페이스 제공*/}
            <select
              value={selectedUniversity}
              onChange={(event) => setSelectedUniversity(event.target.value)}
            >
              {/*학교명을 option으로 생성, 값을 매핑하며 브라우저에 해당 학교명을 띄울 수 있게 됨*/}
              {Object.keys(universityDomains).map((university) => (
                <option key={university} value={university}>
                  {university}
                </option>
              ))}
            </select>
          </div>
        </label>

        {/*학교 이메일 입력 영역*/}
        <label className="form-label">
          <span>학교 이메일</span>
          <div className="email-input">
            <input
              type="text"
              name="email_id"
              value={formData.email_id}
              onChange={handleChange}
              placeholder="이메일 아이디를 입력하세요"
              required
            />
            <strong>@{emailDomain}</strong> {/*emailDomain을 통해 학교 도메인은 지정되어있음(강조)*/}
          </div>
          <span className="form-desc">
            <small>선택한 학교의 이메일 도메인이 자동으로 입력됩니다.</small>
          </span>
        </label>

        {/*학과 입력 영역*/}
        <label className="form-label">
          <span>학과</span>
          <div className="input-box">
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="학과를 입력하세요"
              required
            />
          </div>
        </label>

        {/*학번 입력 영역*/}
        <label className="form-label">
          <span>학번</span>
          <div className="input-box">
            <input
              type="text"
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="학번을 입력하세요"
              required
            />
          </div>
        </label>

        {/*닉네임 입력 영역*/}
        <label className="form-label">
          <span>닉네임</span>
          <div className="input-box">
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="닉네임을 입력하세요"
              required
            />
          </div>
        </label>

        {/*전화번호 입력 영역*/}
        <label className="form-label">
          <span>전화번호</span>
          <div className="input-box">
            <input
              type="text"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="전화번호를 입력하세요"
            />
          </div>
        </label>

        {/*사용자 역할 선택 영역*/}
        <label className="form-label">
          <span>사용자 역할</span>
          <div className="input-box">
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="USER">일반 사용자</option>
              <option value="CLUB_MANAGER">동아리 관리자</option>
            </select>
          </div>
        </label>

        {/*회원가입 실패 시 에러 메시지 출력*/}
        {errorMessage && (
          <p className="form-error-text">{errorMessage}</p>
        )}

        {/*회원가입 버튼*/}
        <button
          type="submit"
          className="primary-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? '가입 중...' : '회원가입'}
        </button>

        {/* 하단 구분선 */}
        <div className="form-line-divider" />

        {/* 이미 계정이 있는 사용자를 로그인 페이지로 이동시키는 안내 문구 */}
        <p className="auth-guide-text">
          이미 계정이 있으신가요?
          <Link to="/login"> 로그인</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default SignupPage;