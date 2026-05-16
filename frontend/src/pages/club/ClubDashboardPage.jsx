// 대시보드에서 사용할 아이콘들
import {
  Bell,
  CalendarDays,
  CreditCard,
  Edit3,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

// 페이지 이동을 위한 Link, 로그아웃 후 이동을 위한 useNavigate 사용
import { Link, useNavigate } from 'react-router-dom';

// 대시보드 전용 CSS 파일 연결
import '../../styles/club/clubDashboard.css';

function ClubDashboardPage() {
  const navigate = useNavigate();

  // 로그인할 때 localStorage에 저장해둔 사용자 정보를 가져옴
  // 정보가 없을 경우 빈 객체를 기본값으로 사용
  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {};

  // 로그아웃 버튼 클릭 시 로그인 정보를 삭제하고 로그인 페이지로 이동
  const handleLogout = () => {
    localStorage.removeItem('loginUser');
    navigate('/login');
  };

  return (
    <div className="club-dashboard-page">
      {/* 왼쪽 사이드바 영역 */}
      <aside className="dashboard-sidebar">
        {/* 사이드바 상단 로고 영역 */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <LayoutDashboard size={22} />
          </div>

          <div>
            <strong>동아리 관리자</strong>
            <span>Club Management</span>
          </div>
        </div>

        {/* 사이드바 메뉴 영역 */}
        <nav className="sidebar-menu">
          {/* 현재 페이지이므로 active 클래스 적용 */}
          <Link to="/club/dashboard" className="sidebar-link active">
            <LayoutDashboard size={19} />
            대시보드
          </Link>

          {/* 동아리 정보 상위 메뉴 */}
          <div className="sidebar-menu-group">
            <div className="sidebar-link sidebar-parent-link">
              <FileText size={19} />
              동아리 정보
            </div>

            {/* 동아리 정보 하위 메뉴 */}
            <div className="sidebar-submenu">
              <Link to="/club/edit" className="sidebar-sub-link">
                <Edit3 size={16} />
                동아리 정보 수정
              </Link>
            </div>
          </div>

          <Link to="/club/members" className="sidebar-link">
            <Users size={19} />
            동아리원 관리
          </Link>

          <Link to="/club/fee" className="sidebar-link">
            <CreditCard size={19} />
            회비 관리
          </Link>

          <Link to="/club/schedule" className="sidebar-link">
            <CalendarDays size={19} />
            일정 관리
          </Link>

          <Link to="/club/settings" className="sidebar-link">
            <Settings size={19} />
            설정
          </Link>
        </nav>

        {/* 로그아웃 버튼 */}
        <button type="button" className="logout-button" onClick={handleLogout}>
          <LogOut size={18} />
          로그아웃
        </button>
      </aside>

      {/* 오른쪽 대시보드 전체 영역 */}
      <main className="dashboard-main">
        <div className="dashboard-frame">
          {/* 대시보드 상단 헤더 */}
          <header className="dashboard-header">
            <div>
              <p className="dashboard-label">Dashboard</p>
              <h1>동아리 운영 대시보드</h1>
              <p className="dashboard-desc">
                동아리 운영 현황을 한 화면에서 확인할 수 있습니다.
              </p>
            </div>

            {/* 오른쪽 사용자 정보 영역 */}
            <div className="dashboard-user-box">
              <button type="button" className="notice-button">
                <Bell size={19} />
              </button>

              <div className="user-profile">
                <div className="user-avatar">
                  {loginUser.nickname ? loginUser.nickname[0] : '관'}
                </div>

                <div>
                  <strong>{loginUser.nickname || '관리자'}</strong>
                  <span>{loginUser.school_name || '학교 정보 없음'}</span>
                </div>
              </div>
            </div>
          </header>

          {/* 상단 주요 현황 요약 카드 영역 */}
          <section className="summary-grid">
            <article className="summary-card">
              <div className="summary-icon members">
                <Users size={22} />
              </div>

              <div>
                <span>총 동아리원</span>
                <strong>-</strong>
                <p>데이터 연동 전입니다.</p>
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-icon health">
                <HeartPulse size={22} />
              </div>

              <div>
                <span>동아리 건강도 점수</span>
                <strong>-</strong>
                <p>데이터 연동 전입니다.</p>
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-icon balance">
                <Wallet size={22} />
              </div>

              <div>
                <span>회비 잔액</span>
                <strong>-</strong>
                <p>데이터 연동 전입니다.</p>
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-icon notice">
                <Megaphone size={22} />
              </div>

              <div>
                <span>공지사항</span>
                <strong>-</strong>
                <p>데이터 연동 전입니다.</p>
              </div>
            </article>
          </section>

          {/* 대시보드 본문 영역 */}
          <section className="dashboard-content-grid">
            {/* 공지사항 패널 */}
            <article className="dashboard-panel notice-panel">
              <div className="panel-title-row">
                <div>
                  <h2>공지사항</h2>
                  <p>공지 데이터가 등록되면 이 영역에 표시됩니다.</p>
                </div>

                <Megaphone size={21} />
              </div>

              <div className="empty-large-box">
                <div className="empty-icon">
                  <Megaphone size={26} />
                </div>

                <h3>등록된 공지사항이 없습니다.</h3>
                <p>
                  공지 제목, 작성일, 작성자, 공지 내용은 추후 백엔드와 DB 연동 후 표시됩니다.
                </p>
              </div>
            </article>

            {/* 활동 일정 패널 */}
            <article className="dashboard-panel activity-panel">
              <div className="panel-title-row">
                <div>
                  <h2>활동 일정</h2>
                  <p>활동 일정 데이터가 등록되면 표시됩니다.</p>
                </div>

                <CalendarDays size={21} />
              </div>

              <div className="empty-panel">
                <p>등록된 활동 일정이 없습니다.</p>
              </div>
            </article>

            {/* 회비 관리 패널 */}
            <article className="dashboard-panel fee-panel">
              <div className="panel-title-row">
                <div>
                  <h2>회비 관리</h2>
                  <p>회비 데이터가 등록되면 표시됩니다.</p>
                </div>

                <CreditCard size={21} />
              </div>

              <div className="empty-panel">
                <p>등록된 회비 내역이 없습니다.</p>
              </div>
            </article>

            {/* 달력 패널: 제목 없이 달력만 표시 */}
            <article className="dashboard-panel calendar-panel">
              <div className="calendar-box">
                <div className="calendar-week">
                  <span>일</span>
                  <span>월</span>
                  <span>화</span>
                  <span>수</span>
                  <span>목</span>
                  <span>금</span>
                  <span>토</span>
                </div>

                <div className="calendar-grid">
                  {Array.from({ length: 35 }).map((_, index) => (
                    <div className="calendar-cell" key={index}>
                      <span>{index + 1 <= 31 ? index + 1 : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ClubDashboardPage;