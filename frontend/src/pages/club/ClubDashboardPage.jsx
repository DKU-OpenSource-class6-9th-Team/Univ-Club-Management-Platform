import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClub } from '../../api/clubs.js';
import '../../styles/club/clubDashboard.css';

import {
  Bell,
  CalendarDays,
  CreditCard,
  Edit3,
  FileText,
  Heart,
  HeartPulse,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircleHeart,
  Settings,
  Users,
  Wallet,
  UserX,
  Send,
  Paperclip,
  Smile,
} from 'lucide-react';


function ClubDashboardPage() {
  const navigate = useNavigate();
  const { clubId } = useParams();

  // 1. 동아리 정보 상태
  const [club, setClub] = useState(null);
  // 1-1. 동아리 정보를 불러오는 중인지 확인하는 상태
  const [isClubLoading, setIsClubLoading] = useState(true);

  // 2. 공지사항 상태
  const [noticeText, setNoticeText] = useState('');
  const [notices, setNotices] = useState([]);

  // 3. 로그인 사용자 정보
  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {};
  // 3-1. 로그인한 사용자가 동아리 운영진인지 확인
  // CLUB_MANAGER 역할을 가진 사용자에게만 동아리 정보 수정 메뉴를 보여줌
  const isClubManager = loginUser.role === 'CLUB_MANAGER';

  // 4. 동아리 정보 가져오기
  useEffect(() => {
    const fetchClub = async () => {
      try {
        const data = await getClub(clubId);
        setClub(data);
      } catch (error) {
        console.error('동아리 정보를 불러오지 못했습니다.', error);
      } finally {
        setIsClubLoading(false);
      }
    };

    fetchClub();
  }, [clubId]);

  // 5. 로그아웃 함수
  const handleLogout = () => {
    localStorage.removeItem('loginUser');
    navigate('/login');
  };

  // 6. 공지사항 등록 함수
  const handleAddNotice = () => {
    if (noticeText.trim() === '') return;

    const newNotice = {
      id: Date.now(),
      content: noticeText,
      createdAt: new Date().toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setNotices([newNotice, ...notices]);
    setNoticeText('');
  };

  
  return (
    <div className="club-dashboard-page">
      <div className="dashboard-fixed-canvas">
        {/* 왼쪽 사이드바 영역 */}
        <aside className="dashboard-sidebar">
          {/* 사이드바 상단 로고 영역 */}
          <div className="sidebar-logo">
            <Link to="/main" className="sidebar-clubflow-logo">
              <span className="sidebar-logo-cf">CM</span>
              <span className="sidebar-logo-text">Club Management</span>
            </Link>
          </div>

        {/* 사이드바 메뉴 영역 */}
        <nav className="sidebar-menu">
          {/* 현재 페이지이므로 active 클래스 적용 */}
          <Link to={`/club/${clubId}/dashboard`} className="sidebar-link active">
            <LayoutDashboard size={19} />
            대시보드
          </Link>

        <div className="sidebar-menu-group">
          {/* 상위 메뉴: 동아리 정보 확인 페이지로 이동 */}
          <Link to={`/club/${clubId}/info`} className="sidebar-link sidebar-parent-link">
            <FileText size={19} />
            동아리 정보
          </Link>

          {/* 하위 메뉴: 운영진용 동아리 정보 수정 페이지 */}
          {isClubManager && (
            <div className="sidebar-submenu">
              <Link to={`/club/${clubId}/edit`} className="sidebar-sub-link">
                <Edit3 size={16} />
                동아리 정보 수정
              </Link>
            </div>
          )}
        </div>

          <Link to={`/club/${clubId}/members`} className="sidebar-link">
            <Users size={19} />
            동아리원 관리
          </Link>

          <Link to={`/club/${clubId}/fee`} className="sidebar-link">
            <CreditCard size={19} />
            회비 관리
          </Link>

          <Link to="/club/schedule" className="sidebar-link">
            <CalendarDays size={19} />
            일정 관리 / 공지
          </Link>
          
          <Link to={`/club/${clubId}/survey`} className="sidebar-link">
            <MessageCircleHeart size={19} />
            만족도 조사
          </Link>

          <Link to="/club/settings" className="sidebar-link">
            <HeartPulse size={19} />
            건강도 분석
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
          
            {/* 브레드크럼 */}
              <nav className="dashboard-breadcrumb">
                <Link to="/main">플랫폼 메인</Link>
                <span>›</span>
                <Link to="/main">내 동아리</Link>
                <span>›</span>
                <span>{isClubLoading ? '불러오는 중...' : club?.name || '동아리'}</span>
                <span>›</span>
                <span className="breadcrumb-current">대시보드</span>
              </nav>

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
                  <strong>{club?.member_count ?? 0}명</strong>
                  <p>현재 활동 중인 동아리원 수입니다.</p>
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
                <div className="summary-icon unpaid">
                  <UserX size={22} />
                </div>

                <div>
                  <span>미납 인원</span>
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

                <div className="notice-body">
                  {/* 공지사항 목록이 표시되는 영역 */}
                  <div className="notice-list">
                    {/* 등록된 공지사항이 없을 때 보여줄 빈 상태 화면 */}
                    {notices.length === 0 ? (
                      <div className="notice-empty-box">
                        <div className="empty-icon">
                          <Megaphone size={26} />
                        </div>

                        <h3>등록된 공지사항이 없습니다.</h3>
                        <p>아래 입력창에 공지사항을 입력하면 이 영역에 바로 표시됩니다.</p>
                      </div>
                    ) : (
                      // 등록된 공지사항이 있을 때 공지 목록을 반복해서 출력
                      notices.map((notice) => (
                        <div className="notice-item" key={notice.id}>
                          <div className="notice-item-icon">
                            <Megaphone size={17} />
                          </div>

                          <div>
                            {/* 공지 내용 */}
                            <p>{notice.content}</p>

                            {/* 공지 등록 시간 */}
                            <span>{notice.createdAt}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 공지사항 입력창과 등록 버튼 영역 */}
                  <div className="notice-input-row">
                    <div className="notice-input-box">
                      <input
                        type="text"
                        placeholder="공지사항을 입력하세요..."
                        value={noticeText}
                        onChange={(e) => setNoticeText(e.target.value)}
                        onKeyDown={(e) => {
                          // Enter 키를 누르면 공지 등록 함수 실행
                          if (e.key === 'Enter') {
                            handleAddNotice();
                          }
                        }}
                      />

                      {/* 첨부파일 아이콘 버튼: 현재는 디자인용, 기능은 추후 구현 */}
                      <button type="button" className="notice-icon-button">
                        <Paperclip size={20} />
                      </button>

                      {/* 이모지 아이콘 버튼: 현재는 디자인용, 기능은 추후 구현 */}
                      <button type="button" className="notice-icon-button">
                      <Smile size={20} />
                      </button>
                    </div>

                      {/* 공지 등록 버튼 */}
                    <button
                      type="button"
                      className="notice-submit-button"
                      onClick={handleAddNotice}
                    >
                      <Send size={18} />
                      공지 등록
                    </button>
                  </div>
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
    </div>
  );
}
export default ClubDashboardPage;