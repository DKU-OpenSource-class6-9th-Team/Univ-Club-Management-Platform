import { useEffect, useState } from 'react';
import { getClubs, getMyClubs, requestJoinClub } from '../api/clubs.js';
import { getCurrentUser, logout } from '../api/accounts.js';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/mainPage.css';


import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Medal,
  Search,
  Trophy,
  Users,
} from 'lucide-react';

function MainPage() {
  const navigate = useNavigate();
  // 메인페이지가 열릴 때 localStorage에 저장된 사용자 정보를 먼저 가져옴
  const savedLoginUser = JSON.parse(localStorage.getItem('loginUser')) || {};

  const [loginUser, setLoginUser] = useState(savedLoginUser);
  const [profile, setProfile] = useState(null);

  //사용자 프로필 드롭다운 메뉴가 열려 있는지 저장하는 상태
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // 내가 가입하거나 관리 중인 동아리 목록
  const [joinedClubs, setJoinedClubs] = useState([]);

  // 나의 일정 목록
  const [schedules, setSchedules] = useState([]);

  // 전체 동아리 목록
  const [allClubs, setAllClubs] = useState([]);

  // 동아리 랭킹 목록
  const [clubRanking, setClubRanking] = useState([]);

  useEffect(() => {
    // 현재 로그인한 사용자 정보를 가져옴
    // 사용자 이름 표시, role 확인, 동아리 등록 버튼 표시 여부에 사용
    const fetchCurrentUser = async () => {
      try {
        const data = await getCurrentUser();

        setLoginUser(data.user);
        setProfile(data.profile);

        localStorage.setItem(
          'loginUser',
          JSON.stringify({
            ...data.user,
            ...data.profile,
          })
        );
      } catch (error) {
        console.error('현재 사용자 정보를 불러오지 못했습니다.', error);
      }
    };

    // 전체 동아리 목록 + 내가 가입/관리 중인 동아리 목록 가져오기
    const fetchClubData = async () => {
      try {
        const clubs = await getClubs();
        const myClubs = await getMyClubs();
        
        // 혹시 백엔드 응답이 배열이 아니라 results 형태일 경우까지 대비
        const clubList = Array.isArray(clubs) ? clubs : clubs.results || [];
        const myClubList = Array.isArray(myClubs) ? myClubs : myClubs.results || [];

        console.log('전체 동아리:', clubList);
        console.log('내 동아리:', myClubList);

        setAllClubs(clubList);
        setJoinedClubs(myClubList);
        setClubRanking(clubList);

      } catch (error) {
        console.error('동아리 데이터를 불러오지 못했습니다.', error);
      }
    };

    fetchCurrentUser();
    fetchClubData();
  }, []);

  // 관리자 여부
  const isClubManager =
    profile?.role === 'CLUB_MANAGER' || loginUser?.role === 'CLUB_MANAGER';

  // 화면에 표시할 사용자 이름
  const userName =
    profile?.nickname ||
    loginUser?.nickname ||
    loginUser?.username ||
    '사용자';
  
  // 사용자 메뉴 열기/닫기
  const handleToggleUserMenu = (event) => {
    event.stopPropagation();
    setIsUserMenuOpen((prev) => !prev);
  };

  // 마이 페이지로 이동
  const handleMoveToMyPage = (event) => {
    event.stopPropagation();
    setIsUserMenuOpen(false);
    navigate('/mypage'); 
  };

  // 로그아웃 처리
  const handleLogout = async (event) => {
    event.stopPropagation();

    try {
        await logout();

        localStorage.removeItem('loginUser');
        setLoginUser({});
        setProfile(null);
        setIsUserMenuOpen(false);

        alert('로그아웃되었습니다.');
        navigate('/login', { replace: true });
    } catch (error) {
        console.error('로그아웃 중 오류가 발생했습니다.', error);
    }
  };

  // 동아리 분야 라벨 변환 
  const getClubCategoryLabel = (category) => {
    if (category === 'CENTRAL') return '중앙동아리';
    if (category === 'TEMPORARY') return '기타동아리';

    return category || '-';
  };

  const handleJoinClub = async (clubId) => {
  try {
    const result = await requestJoinClub(clubId);

    alert(result.message || "가입 신청이 완료되었습니다.");

    // 가입 신청 후 화면 데이터 새로고침
    window.location.reload();
  } catch (error) {
    alert(error.message || "가입 신청에 실패했습니다.");
  }
};

  return (
    <div className="main-page">
      {/* ==============================
          상단 헤더 영역
          - 로고 / 검색창 / 알림 / 사용자 정보
      =============================== */}
      <header className="main-topbar">
        {/* 왼쪽 로고 영역 */}
        <Link to="/main" className="main-logo">
          <div className="main-logo-mark">CF</div>
          <span>ClubFlow</span>
        </Link>

        {/* 가운데 동아리 검색창 */}
        <div className="main-search-box">
          <input type="text" placeholder="동아리 검색" />
          <Search size={21} />
        </div>

        {/* 오른쪽 사용자 영역 */}
        <div className="main-user-area">
          {/* 알림 버튼 */}
          <button type="button" className="main-bell-button">
            <Bell size={21} />

            {/* 현재는 알림 데이터 연결 전이므로 -으로 표시 */}
            <span className="main-bell-badge">-</span>
          </button>

            {/* 프로필 이미지 + 사용자 이름을 하나의 묶음으로 처리 */}
            <div className="main-profile-group">
                <div className="main-profile-image" onClick={handleToggleUserMenu}>
                    {userName[0]}
                </div>
  
                <button
                  type="button"
                  className="main-user-button"
                  onClick={handleToggleUserMenu}
                >
                  <span>{userName}</span>
                  <ChevronDown size={18} />
                  </button>

                {/* 사용자 프로필 드롭다운 메뉴 */}
                {isUserMenuOpen && (
                  <div 
                    className="main-user-dropdown"
                    onClick={(event) => event.stopPropagation()}
                 >
                    <button
                      type="button"
                      onClick={handleMoveToMyPage}
                    >
                      마이페이지
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                    >
                       로그아웃하기
                    </button>
                  </div>
                )}
            </div>
        </div>
    </header>
      {/* ==============================
          메인 본문 영역
      =============================== */}
      <main className="main-content">
        {/* 페이지 제목 영역 */}
        <section className="main-title-section">
            <div>
                <h1>플랫폼 메인</h1>
                <p>내 동아리와 전체 동아리 정보를 한눈에 확인하세요.</p>
            </div>

            {isClubManager && (
                <Link to="/club/create" className="main-create-club-button">
                동아리 등록
                </Link>
            )}
        </section>

        {/* ==============================
            상단 요약 카드 영역
            - 내가 가입한 동아리 / 가입 신청 / 일정 / 평균 건강도
        =============================== */}
        <section className="main-summary-grid">
          {/* 내가 가입한 동아리 수 */}
          <article className="main-summary-card">
            <div className="main-summary-icon joined">
              <Users size={31} />
            </div>

            <div>
              <p>내가 가입한 동아리</p>

              {/* joinedClubs 배열 길이로 가입 동아리 수 표시 */}
              <strong>{joinedClubs.length}개</strong>
              <span>활동 중</span>
            </div>
          </article>

          {/* 가입 신청 현황 */}
          <article className="main-summary-card">
            <div className="main-summary-icon request">
              <ClipboardCheck size={31} />
            </div>

            <div>
              <p>가입 신청 현황</p>

              {/* 신청 데이터 연결 전이므로 0 표시 */}
              <strong>0</strong>
              <span>신청 중</span>
            </div>
          </article>

          {/* 나의 일정 */}
          <article className="main-summary-card">
            <div className="main-summary-icon schedule">
              <CalendarDays size={31} />
            </div>

            <div>
              <p>나의 일정</p>

              {/* schedules 배열 길이로 일정 수 표시 */}
              <strong>{schedules.length}건</strong>
              <span>다가오는 일정</span>
            </div>
          </article>

          {/* 동아리 평균 건강도 */}
          <article className="main-summary-card">
            <div className="main-summary-icon health">
              <Trophy size={31} />
            </div>

            <div>
              <p>동아리 평균 건강도</p>

              {/* 건강도 데이터 연결 전이므로 - 표시 */}
              <strong>-</strong>
              <span>데이터 연동 전</span>
            </div>
          </article>
        </section>

        {/* ==============================
            중간 영역
            - 내가 가입한 동아리 / 나의 일정
        =============================== */}
        <section className="main-board-grid">
          {/* 내가 가입한 동아리 패널 */}
          <article className="main-panel joined-club-panel">
            <div className="main-panel-title-row">
              <h2>내가 가입한 동아리</h2>
            </div>

            {/* 가입한 동아리가 없을 때 빈 상태 표시 */}
            {joinedClubs.length === 0 ? (
              <div className="main-empty-box">
                <p>가입한 동아리 데이터가 없습니다.</p>
              </div>
            ) : (
              /*
                joinedClubs에 데이터가 생기면
                map으로 동아리 목록을 반복 출력
              */
              <div className="joined-club-list">
                {joinedClubs.map((club) => (
                  <div className="joined-club-item" key={club.id}>
                    <div className="club-symbol">
                      <Users size={24} />
                    </div>

                    <div className="joined-club-info">
                        <Link to={`/club/${club.id}/dashboard`}
                        className="joined-club-name-link"
                        >
                            {club.name}
                        </Link>
                        <span>{getClubCategoryLabel(club.category)}</span>
                    </div>

                    {/* 해당 동아리 대시보드로 이동 */}
                    <Link
                      to={`/club/${club.id}/dashboard`}
                      className="dashboard-move-button"
                    >
                      대시보드 이동
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </article>

          {/* 나의 일정 패널 */}
          <article className="main-panel schedule-panel">
            <div className="main-panel-title-row">
              <h2>나의 일정</h2>
            </div>

            {/* 일정 데이터가 없을 때 빈 상태 표시 */}
            {schedules.length === 0 ? (
              <div className="main-empty-box">
                <p>등록된 일정 데이터가 없습니다.</p>
              </div>
            ) : (
              /*
                schedules에 데이터가 생기면
                map으로 일정 목록을 반복 출력
              */
              <div className="schedule-list">
                {schedules.map((schedule) => (
                  <div className="schedule-item" key={schedule.id}>
                    <div className="schedule-date-box">
                      <strong>{schedule.date}</strong>
                      <span>{schedule.day}</span>
                    </div>

                    <div>
                      <strong>{schedule.title}</strong>
                      <p>{schedule.clubName}</p>
                      <span>{schedule.time}</span>
                    </div>

                    <div className="schedule-dday">{schedule.dday}</div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {/* ==============================
            하단 영역
            - 전체 동아리 목록 / 동아리 랭킹
        =============================== */}
        <section className="main-bottom-grid">
          {/* 전체 동아리 목록 패널 */}
          <article className="main-panel all-club-panel">
            <div className="main-panel-title-row club-list-title-row">
              <h2>전체 동아리 목록</h2>

              {/* 검색 및 필터 영역 */}
              <div className="club-filter-row">
                <input type="text" placeholder="동아리명 검색" />

                <select defaultValue="all-category">
                  <option value="all-category">전체 분야</option>
                </select>

                <select defaultValue="all-status">
                  <option value="all-status">전체</option>
                </select>
              </div>
            </div>

            {/* 전체 동아리 목록 테이블 */}
            <div className="club-table">
              {/* 테이블 제목 줄 */}
              <div className="club-table-head">
                <span>동아리명</span>
                <span>분야</span>
                <span>회원 수/총 정원</span>
                <span>건강도</span>
                <span>가입 신청</span>
              </div>

              {/* 전체 동아리 데이터가 없을 때 */}
              {allClubs.length === 0 ? (
                <div className="club-table-empty">
                  <p>등록된 동아리 데이터가 없습니다.</p>
                </div>
              ) : (
                /*
                  allClubs에 데이터가 생기면
                  map으로 전체 동아리 목록을 반복 출력
                */
                allClubs.map((club) => {
                    const isMyClub = joinedClubs.some((joinedClub) => joinedClub.id === club.id);
                    
                    return (
                        <div className="club-table-row" key={club.id}>
                            {/* 동아리명 */}
                            <span>{club.name}</span>

                            {/* 분야/카테고리 */}
                            <span>{getClubCategoryLabel(club.category)}</span>

                            {/* 현재 회원 수*/}
                            <span>
                                {club.member_count ?? 0}/{club.capacity || '-'}
                            </span>

                            {/* 건강도 점수는 추후 분석 API 구현 후 연결 */}
                            <span>-</span>
                      
                            <span>
                                {isMyClub ? (
                                  <button type="button" className="join-button joined" disabled>
                                    가입중
                                  </button>
                              ) : (
                                  <button
                                    type="button"
                                    className="join-button"
                                    onClick={() => handleJoinClub(club.id)}
                                  >
                                    가입 신청
                                  </button>
                              )}
                            </span>
                          </div>
                        );
                     })
                )}
            </div>
          </article>

          {/* 동아리 랭킹 패널 */}
          <article className="main-panel ranking-panel">
            <div className="main-panel-title-row">
              <h2>동아리 랭킹</h2>
            </div>

            {/* 랭킹 테이블 */}
            <div className="ranking-table">
              {/* 랭킹 테이블 제목 줄 */}
              <div className="ranking-table-head">
                <span></span>
                <span>동아리명</span>
                <span>분야</span>
                <span>건강도</span>
              </div>

              {/* 랭킹 데이터가 없을 때 */}
              {clubRanking.length === 0 ? (
                <div className="ranking-empty">
                  <p>랭킹 데이터가 없습니다.</p>
                </div>
              ) : (
                /*
                  clubRanking에 데이터가 생기면
                  map으로 랭킹 목록을 반복 출력
                */
                clubRanking.map((club, index) => (
                  <div className="ranking-row" key={club.id}>
                    <span className="ranking-number">
                      {/* 1등은 메달 아이콘, 나머지는 숫자 표시 */}
                      {index === 0 ? <Medal size={17} /> : index + 1}
                    </span>

                    <span>{club.name}</span>
                    <span>{getClubCategoryLabel(club.category)}</span>
                    <span>{club.healthScore || '-'}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default MainPage;