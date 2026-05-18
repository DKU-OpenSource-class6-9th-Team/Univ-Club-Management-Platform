import { Link } from 'react-router-dom';
//로그인과 회원가입 페이지에서 공통적으로 사용하는 기본 레이아웃

// children: LoginPage.jsx 또는 SignupPage.jsx에서 전달하는 실제 form 내용
function AuthLayout({
  title, 
  subtitle,
  children,
  headerButtonText = '로그인',
  headerButtonTo = '/login',
  showAuthLink = true 
}) {
  return (
    <div className="auth-page">
        {/*헤더 영역*/}
      <header className="auth-header">
        {/*LINK를 통해 클릭시 페이지 새로고침 없이 URL변경을 통한 컴포넌트(페이지)변경*/}
        <Link
          to="/login"
          className="auth-logo"
          aria-label="동아리 운영 관리 상호작용 플랫폼"
        >
          <span>동아리 운영 관리 상호작용 플랫폼</span>
        </Link>

        {/*헤더에서의 오른쪽 영역,
            로그인 버튼을 구현, 이후 현황과 같은 버튼 추가 구현 가능*/}
        {showAuthLink && (
          <nav className="auth-navigate">
            <Link to={headerButtonTo} className="auth-navigate-login">
              {headerButtonText}
            </Link>
          </nav>
        )}
      </header>

        {/*본문 영역
            auth-main은 중앙의 정렬을 담당,
            auth-blovk은 로그인 및 회원가입 폼이 들어가는 흰색 블록 영역*/}
      <main className="auth-main">
        <section className="auth-block">
          <h2>{title}</h2>
          <p className="auth-block-subtitle">{subtitle}</p>
          {children}
        </section>
      </main>
    </div>
  );
}

export default AuthLayout;