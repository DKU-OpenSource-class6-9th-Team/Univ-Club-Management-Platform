import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Eye, EyeOff, Lock, User } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';

const universityDomains = { //학교 이메일 도메인을 설정하고 이를 통해 선택 시 자동 표시
  단국대학교: 'dankook.ac.kr',
  경희대학교: 'khu.ac.kr',
};

function SignupPage() {
  const [selectedUniversity, SelectUniversity] = useState('단국대학교'); //선택 기본 값
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordCheck, setShowPasswordCheck] = useState(false);

  const emailDomain = universityDomains[selectedUniversity]; //선택된 학교의 이메일 도메인 가져옴

  return (
    <AuthLayout title="회원가입" subtitle="내용 입력 1">
      <form className="auth-commonform signup-form"> {/*회원가입 폼의 전체적인 영역*/}
        <label className="form-label">
          <span>아이디</span>
          <div className="input-box">
            <User size={20} />
            <input type="text" placeholder="아이디를 입력하세요" />
          </div>
        </label>

        <label className="form-label">
          <span>비밀번호</span>
          <div className="input-box">
            <Lock size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호를 입력하세요"
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
              placeholder="비밀번호를 다시 입력하세요"
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

            {/*value의 값은 setSelectUiversity와 연결, 다른 학교 선택 시 onchange의 상태 변경
                select는 선택지들을 보여주는 인터페이스 제공*/}
            <select
              value={selectedUniversity}
              onChange={(event) => SelectUniversity(event.target.value)}
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
            <input type="text" placeholder="이메일 아이디를 입력하세요" />
            <strong>@{emailDomain}</strong> {/*emailDomain을 통해 학교 도메인은 지정되어있음(강조)*/}
          </div>
          <span className="form-desc">
            <small>선택한 학교의 이메일 도메인이 자동으로 입력됩니다.</small>
          </span>
        </label>


        {/*회원가입 버튼*/}
        <button type="button" className="primary-button">
          회원가입
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