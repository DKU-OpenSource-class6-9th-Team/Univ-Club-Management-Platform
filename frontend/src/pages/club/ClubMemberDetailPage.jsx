import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClub } from '../../api/clubs.js';
import { fetchClubMemberDetail } from '../../api/clubMembers.js';

import '../../styles/club/clubDashboard.css';
import '../../styles/club/clubMemberDetail.css';

import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CreditCard,
  Edit3,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MessageCircleHeart,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

function ClubMemberDetailPage() {
  const navigate = useNavigate();
  const { clubId, memberId } = useParams();

  const [club, setClub] = useState(null);
  const [member, setMember] = useState(null);
  const [isClubLoading, setIsClubLoading] = useState(true);
  const [isMemberLoading, setIsMemberLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {};
  const isClubManager = loginUser.role === 'CLUB_MANAGER';

  useEffect(() => {
    const loadClub = async () => {
      try {
        const data = await getClub(clubId);
        setClub(data);
      } catch (error) {
        console.error('동아리 정보를 불러오지 못했습니다.', error);
      } finally {
        setIsClubLoading(false);
      }
    };

    loadClub();
  }, [clubId]);

  useEffect(() => {
    const loadMember = async () => {
      try {
        setIsMemberLoading(true);
        setErrorMessage('');

        const data = await fetchClubMemberDetail(clubId, memberId);
        setMember(data);
      } catch (error) {
        console.error('동아리원 상세 정보를 불러오지 못했습니다.', error);
        setErrorMessage(error.message || '동아리원 상세 정보를 불러오지 못했습니다.');
      } finally {
        setIsMemberLoading(false);
      }
    };

    loadMember();
  }, [clubId, memberId]);

  const handleLogout = () => {
    localStorage.removeItem('loginUser');
    navigate('/login');
  };

  const getDisplayValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return value;
  };

  if (isMemberLoading) {
    return (
      <div className="club-dashboard-page">
        <div className="club-member-detail-loading">
          동아리원 상세 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (errorMessage || !member) {
    return (
      <div className="club-dashboard-page">
        <div className="club-member-detail-loading">
          {errorMessage || '동아리원 정보를 찾을 수 없습니다.'}
        </div>
      </div>
    );
  }

  return (
    <div className="club-dashboard-page">
      <div className="dashboard-fixed-canvas">
        <aside className="dashboard-sidebar">
          <div className="sidebar-logo">
            <Link to="/main" className="sidebar-clubflow-logo">
              <span className="sidebar-logo-cf">CF</span>
              <span className="sidebar-logo-text">ClubFlow</span>
            </Link>
          </div>

          <nav className="sidebar-menu">
            <Link to={`/club/${clubId}/dashboard`} className="sidebar-link">
              <LayoutDashboard size={19} />
              대시보드
            </Link>

            <div className="sidebar-menu-group">
              <Link
                to={`/club/${clubId}/info`}
                className="sidebar-link sidebar-parent-link"
              >
                <FileText size={19} />
                동아리 정보
              </Link>

              {isClubManager && (
                <div className="sidebar-submenu">
                  <Link to={`/club/${clubId}/edit`} className="sidebar-sub-link">
                    <Edit3 size={16} />
                    동아리 정보 수정
                  </Link>
                </div>
              )}
            </div>

            <Link to={`/club/${clubId}/members`} className="sidebar-link active">
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

          <button type="button" className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            로그아웃
          </button>
        </aside>

        <main className="dashboard-main club-member-detail-main">
          <div className="dashboard-frame club-member-detail-frame">
            <nav className="dashboard-breadcrumb">
              <Link to="/main">플랫폼 메인</Link>
              <span>›</span>
              <Link to="/main">내 동아리</Link>
              <span>›</span>
              <span>{isClubLoading ? '불러오는 중...' : club?.name || '동아리'}</span>
              <span>›</span>
              <Link to={`/club/${clubId}/members`}>동아리원 관리</Link>
              <span>›</span>
              <span className="breadcrumb-current">회원 상세</span>
            </nav>

            <header className="dashboard-header">
              <div>
                <p className="dashboard-label">Member Detail</p>
                <h1>회원별 상세 페이지</h1>
                <p className="dashboard-desc">
                  동아리원의 기본 정보, 역할 권한, 활동 상태를 한 화면에서 확인합니다.
                </p>
              </div>

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

            <section className="club-member-detail-content">
              <section className="member-detail-hero-card">
                <div className="member-detail-avatar">
                  <User size={42} />
                </div>

                <div className="member-detail-hero-info">
                  <h2>{getDisplayValue(member.name)}</h2>
                  <p>
                    {getDisplayValue(member.department)} · {getDisplayValue(member.student_id)}
                  </p>

                  <div className="member-detail-badge-row">
                    <span className="member-detail-badge role">
                      {getDisplayValue(member.role_display)}
                    </span>
                    <span className={`member-detail-badge status ${member.status}`}>
                      {getDisplayValue(member.status_display)}
                    </span>
                    <span className={`member-detail-badge grade ${member.activity_grade}`}>
                      {getDisplayValue(member.activity_grade_display)}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/club/${clubId}/members`}
                  className="member-detail-back-button"
                >
                  <ArrowLeft size={18} />
                  목록으로
                </Link>
              </section>

              <section className="member-detail-summary-grid">
                <article className="member-detail-summary-card">
                  <span>역할</span>
                  <strong>{getDisplayValue(member.role_display)}</strong>
                  <p>{getDisplayValue(member.role_permission_summary)}</p>
                </article>

                <article className="member-detail-summary-card">
                  <span>상태</span>
                  <strong>{getDisplayValue(member.status_display)}</strong>
                  <p>현재 동아리원 관리 상태입니다.</p>
                </article>

                <article className="member-detail-summary-card">
                  <span>활동 점수</span>
                  <strong>{member.activity_score ?? 0}점</strong>
                  <p>동아리 활동 데이터를 기반으로 관리됩니다.</p>
                </article>

                <article className="member-detail-summary-card">
                  <span>활동 등급</span>
                  <strong>{getDisplayValue(member.activity_grade_display)}</strong>
                  <p>활동 점수 기준 자동 산출 등급입니다.</p>
                </article>
              </section>

              <section className="member-detail-grid">
                <article className="member-detail-panel">
                  <div className="member-detail-panel-title">
                    <User size={20} />
                    <h3>기본 정보</h3>
                  </div>

                  <div className="member-detail-list">
                    <div className="member-detail-row">
                      <span>이름</span>
                      <strong>{getDisplayValue(member.name)}</strong>
                    </div>
                    <div className="member-detail-row">
                      <span>아이디</span>
                      <strong>{getDisplayValue(member.username)}</strong>
                    </div>
                    <div className="member-detail-row">
                      <span>이메일</span>
                      <strong>{getDisplayValue(member.email)}</strong>
                    </div>
                    <div className="member-detail-row">
                      <span>학번</span>
                      <strong>{getDisplayValue(member.student_id)}</strong>
                    </div>
                    <div className="member-detail-row">
                      <span>학과</span>
                      <strong>{getDisplayValue(member.department)}</strong>
                    </div>
                    <div className="member-detail-row">
                      <span>가입일</span>
                      <strong>{getDisplayValue(member.joined_at)}</strong>
                    </div>
                  </div>
                </article>

                <article className="member-detail-panel">
                  <div className="member-detail-panel-title">
                    <ShieldCheck size={20} />
                    <h3>역할 및 권한</h3>
                  </div>

                  <div className="member-permission-box">
                    <strong>{getDisplayValue(member.role_permission_summary)}</strong>

                    <ul>
                      {(member.role_permissions || []).map((permission) => (
                        <li key={permission}>{permission}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              </section>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ClubMemberDetailPage;