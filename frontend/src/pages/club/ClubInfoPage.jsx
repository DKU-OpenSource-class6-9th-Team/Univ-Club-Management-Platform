import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClub } from '../../api/clubs.js';

//동아리 정보 페이지는 대시보드와 같은 사이드바/브레드크럼/상단 사용자 정보 구조를 사용
import '../../styles/club/clubDashboard.css';
import '../../styles/club/clubInfo.css';

import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  Edit3,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MapPin,
  Phone,
  User,
  Users,
} from 'lucide-react';

function ClubInfoPage() {
  const navigate = useNavigate();

  // URL의 /club/:clubId/info 에서 clubId 값을 가져옴
  const { clubId } = useParams();

  // 백엔드에서 가져온 동아리 상세 정보를 저장하는 상태
  const [club, setClub] = useState(null);

  // 동아리 정보를 불러오는 중인지 확인하는 상태
  const [isLoading, setIsLoading] = useState(true);

  // 로그인할 때 localStorage에 저장해둔 사용자 정보를 가져옴
  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {};

  // 현재 페이지 이름
  // 브레드크럼 마지막 항목과 상단 제목에 사용함
  const currentPageName = '동아리 정보';

  // 로그인한 사용자가 동아리 운영진인지 확인
  // 운영진일 때만 사이드바에 '동아리 정보 수정' 하위 메뉴를 보여줌
  const isClubManager = loginUser.role === 'CLUB_MANAGER';

  // 페이지가 열릴 때 현재 clubId에 해당하는 동아리 정보를 백엔드에서 가져옴
  useEffect(() => {
    const fetchClub = async () => {
      try {
        const data = await getClub(clubId);

        // 가져온 동아리 정보를 club 상태에 저장
        setClub(data);
      } catch (error) {
        console.error('동아리 정보를 불러오지 못했습니다.', error);
      } finally {
        // 성공/실패와 관계없이 로딩 상태 종료
        setIsLoading(false);
      }
    };

    fetchClub();
  }, [clubId]);

  // 이미지 주소를 화면에 표시 가능한 전체 주소로 바꿔주는 함수
  const getImageUrl = (imageUrl) => {
  // 이미지가 없으면 빈 문자열 반환
  if (!imageUrl) return '';

  // 이미 http로 시작하는 완전한 주소면 그대로 사용
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }

  // /media/club_images/... 처럼 상대 경로로 올 경우
  // Django 서버 주소를 앞에 붙여서 완전한 이미지 주소로 만듦
  return `http://localhost:8000${imageUrl}`;
  };

  // 로그아웃 버튼 클릭 시 로그인 정보를 삭제하고 로그인 페이지로 이동
  const handleLogout = () => {
    localStorage.removeItem('loginUser');
    navigate('/login');
  };

  // 백엔드에 저장된 동아리 구분 값을 화면용 한국어로 바꿔주는 함수
  const getClubTypeLabel = (value) => {
    if (value === 'CENTRAL') return '중앙동아리';
    if (value === 'TEMPORARY') return '기타동아리';

    return value || '-';
  };

  // 모집 여부 값을 화면에 보여줄 문구로 바꿔주는 함수
  const getRecruitStatusLabel = () => {
    if (!club) return '-';

    if (club.is_recruiting) {
      return '모집중';
    }

    return '모집 마감';
  };

  // 날짜 값이 없으면 '-'로 표시
  const formatDate = (dateValue) => {
    if (!dateValue) return '-';

    return dateValue;
  };

  // 아직 동아리 정보를 불러오는 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="club-dashboard-page">
        <div className="club-info-loading">
          동아리 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  // 로딩이 끝났는데 club 데이터가 없으면 안내 화면 표시
  if (!club) {
    return (
      <div className="club-dashboard-page">
        <div className="club-info-loading">
          동아리 정보를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="club-dashboard-page">
      <div className="dashboard-fixed-canvas">
        {/* 왼쪽 사이드바 영역 */}
        <aside className="dashboard-sidebar">
          {/* 사이드바 상단 로고 영역 */}
          <div className="sidebar-logo">
            <Link to="/main" className="sidebar-clubflow-logo">
              <span className="sidebar-logo-cf">CF</span>
              <span className="sidebar-logo-text">ClubFlow</span>
            </Link>
          </div>

          {/* 사이드바 메뉴 영역 */}
          <nav className="sidebar-menu">
            {/* 대시보드 페이지로 이동 */}
            <Link to={`/club/${clubId}/dashboard`} className="sidebar-link">
              <LayoutDashboard size={19} />
              대시보드
            </Link>

            {/* 동아리 정보 메뉴 그룹 */}
            <div className="sidebar-menu-group">
              {/* 현재 페이지이므로 active 클래스 적용 */}
              <Link
                to={`/club/${clubId}/info`}
                className="sidebar-link sidebar-parent-link active"
              >
                <FileText size={19} />
                동아리 정보
              </Link>

              {/* 운영진에게만 동아리 정보 수정 메뉴 표시 */}
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

        {/* 오른쪽 전체 영역 */}
        <main className="dashboard-main club-info-main">
          <div className="dashboard-frame club-info-frame">
            {/* 브레드크럼 */}
            <nav className="dashboard-breadcrumb">
              <Link to="/main">플랫폼 메인</Link>
              <span>›</span>
              <Link to="/main">내 동아리</Link>
              <span>›</span>
              <span>{club.name || '동아리'}</span>
              <span>›</span>
              <span className="breadcrumb-current">{currentPageName}</span>
            </nav>

            {/* 상단 헤더 */}
            <header className="dashboard-header">
              <div>
                <p className="dashboard-label">Club Info</p>
                <h1>{currentPageName}</h1>
                <p className="dashboard-desc">
                  동아리 등록 시 입력한 기본 정보와 모집 정보를 확인할 수 있습니다.
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

            {/* 동아리 정보 본문 영역 */}
            <section className="club-info-content">
              {/* 대표 카드 */}
              <section className="club-info-hero-card">
                <div className="club-info-image-box">
                  {club.image ? (
                    <img src={getImageUrl(club.image)} alt={`${club.name} 이미지`} />
                  ) : (
                    <Building2 size={52} />
                  )}
                </div>

                <div className="club-info-hero-content">
                  <div className="club-info-title-row">
                    <div>
                      <h2>{club.name}</h2>
                      <p>{getClubTypeLabel(club.club_type || club.category)}</p>
                    </div>

                    <span
                      className={
                        club.is_recruiting ? 'recruit-badge active' : 'recruit-badge'
                      }
                    >
                      {getRecruitStatusLabel()}
                    </span>
                  </div>

                  <p className="club-info-description">
                    {club.description || '등록된 동아리 소개가 없습니다.'}
                  </p>
                </div>
              </section>

              {/* 요약 카드 */}
              <section className="club-info-summary-grid">
                <article className="club-info-summary-card">
                  <Users size={24} />
                  <div>
                    <span>회원 수/총 정원</span>
                    <strong>{club.member_count ?? 0}/{club.capacity ?? 0}</strong>
                  </div>
                </article>

                <article className="club-info-summary-card">
                  <User size={24} />
                  <div>
                    <span>대표자</span>
                    <strong>{club.leader_name || '-'}</strong>
                  </div>
                </article>

                <article className="club-info-summary-card">
                  <CalendarDays size={24} />
                  <div>
                    <span>모집 상태</span>
                    <strong>{getRecruitStatusLabel()}</strong>
                  </div>
                </article>

                <article className="club-info-summary-card">
                  <MapPin size={24} />
                  <div>
                    <span>동방 위치</span>
                    <strong>{club.location || '-'}</strong>
                  </div>
                </article>
              </section>

              {/* 상세 정보 */}
              <section className="club-info-content-grid">
                {/* 기본 정보 패널 */}
                <article className="club-info-panel">
                  <div className="club-info-panel-title">
                    <FileText size={20} />
                    <h3>기본 정보</h3>
                  </div>

                  <div className="club-info-detail-list">
                    <div className="club-info-detail-row">
                      <span>동아리명</span>
                      <strong>{club.name || '-'}</strong>
                    </div>

                    <div className="club-info-detail-row">
                      <span>동아리 구분</span>
                      <strong>{getClubTypeLabel(club.club_type || club.category)}</strong>
                    </div>

                    <div className="club-info-detail-row">
                      <span>동방 위치</span>
                      <strong>{club.location || '-'}</strong>
                    </div>

                    <div className="club-info-detail-row">
                      <span>소개</span>
                      <strong>{club.description || '-'}</strong>
                    </div>
                  </div>
                </article>

                {/* 모집 정보 패널 */}
                <article className="club-info-panel">
                  <div className="club-info-panel-title">
                    <CalendarDays size={20} />
                    <h3>모집 정보</h3>
                  </div>

                  <div className="club-info-detail-list">
                    <div className="club-info-detail-row">
                      <span>모집 여부</span>
                      <strong>{getRecruitStatusLabel()}</strong>
                    </div>

                    <div className="club-info-detail-row">
                      <span>모집 시작일</span>
                      <strong>{formatDate(club.recruit_start_date)}</strong>
                    </div>

                    <div className="club-info-detail-row">
                      <span>모집 마감일</span>
                      <strong>{formatDate(club.recruit_end_date)}</strong>
                    </div>

                    <div className="club-info-detail-row">
                      <span>이번 모집 인원</span>
                      <strong>{club.recruit_members ? `${club.recruit_members}명` : '-'}</strong>
                    </div>
                  </div>
                </article>

                {/* 연락 정보 패널 */}
                <article className="club-info-panel">
                  <div className="club-info-panel-title">
                    <Phone size={20} />
                    <h3>연락 정보</h3>
                  </div>

                  <div className="club-info-detail-list">
                    <div className="club-info-detail-row">
                      <span>대표자 이름</span>
                      <strong>{club.leader_name || '-'}</strong>
                    </div>

                    <div className="club-info-detail-row">
                      <span>전화번호</span>
                      <strong>{club.contact_phone || '-'}</strong>
                    </div>

                    <div className="club-info-detail-row">
                      <span>이메일</span>
                      <strong>{club.contact_email || '-'}</strong>
                    </div>
                  </div>
                </article>

                {/* 우측 하단 빈 공간 + 수정하기 버튼 */}
                <div className="club-info-empty-space">
                  {isClubManager && (
                    <Link
                      to={`/club/${clubId}/edit`}
                      className="club-info-edit-button"
                    >
                      수정하기
                    </Link>
                  )}
                </div>
              </section>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ClubInfoPage;