import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClub } from '../../api/clubs.js';
import {
  approveClubJoinRequest,
  fetchClubJoinRequests,
  fetchClubMembers,
  rejectClubJoinRequest,
  updateClubMember,
} from '../../api/clubMembers.js';

import '../../styles/club/clubDashboard.css';
import '../../styles/club/clubMembers.css';

import {
  Bell,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  CreditCard,
  Edit3,
  FileText,
  Filter,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  XCircle,
} from 'lucide-react';

const INITIAL_FILTERS = {
  search: '',
  role: '',
  status: '',
  scoreRange: '',
};

const ROLE_PERMISSION_INFO = {
  president: {
    level: 'owner',
    summary: '전체 관리 권한',
    permissions: [
      '동아리 정보 관리',
      '동아리원 관리',
      '역할 및 권한 관리',
      '일정 관리',
      '회비 관리',
      '홍보/모집 관리',
      '건강도 대시보드 관리',
    ],
  },
  vice_president: {
    level: 'manager',
    summary: '운영 보조 및 주요 관리 권한',
    permissions: [
      '동아리원 관리',
      '일정 관리',
      '홍보/모집 관리',
      '건강도 대시보드 확인',
    ],
  },
  executive: {
    level: 'staff',
    summary: '일정, 출석, 홍보 운영 권한',
    permissions: [
      '일정 관리',
      '출석 관리',
      '홍보/모집 관리',
      '동아리원 활동 정보 확인',
    ],
  },
  treasurer: {
    level: 'finance',
    summary: '회비 관리 권한',
    permissions: [
      '회비 납부 내역 관리',
      '수입/지출 내역 관리',
      '영수증 관리',
      '회비 건강도 확인',
    ],
  },
  member: {
    level: 'basic',
    summary: '조회 및 참여 권한',
    permissions: [
      '동아리 정보 조회',
      '일정 확인',
      '활동 참여',
      '본인 활동 정보 확인',
    ],
  },
};

function getRolePermissionInfo(role) {
  return ROLE_PERMISSION_INFO[role] || ROLE_PERMISSION_INFO.member;
}

function buildApiFilters(filters) {
  const apiFilters = {
    search: filters.search.trim(),
    role: filters.role,
    status: filters.status,
  };

  if (filters.scoreRange === '80') {
    apiFilters.minScore = 80;
  }

  if (filters.scoreRange === '50-79') {
    apiFilters.minScore = 50;
    apiFilters.maxScore = 79;
  }

  if (filters.scoreRange === '0-49') {
    apiFilters.maxScore = 49;
  }

  return apiFilters;
}

function getErrorMessage(error, fallbackMessage) {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
}

function ClubMemberListPage() {
  const navigate = useNavigate();
  const { clubId } = useParams();

  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);

  const [isClubLoading, setIsClubLoading] = useState(true);
  const [isMemberLoading, setIsMemberLoading] = useState(true);
  const [isJoinRequestLoading, setIsJoinRequestLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [joinRequestErrorMessage, setJoinRequestErrorMessage] = useState('');
  const [joinRequestActionMessage, setJoinRequestActionMessage] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState(null);

  const [filterInputs, setFilterInputs] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {};
  const isClubManager = loginUser.role === 'CLUB_MANAGER';

  const currentPageName = '동아리원 관리';

  const hasActiveFilters =
    appliedFilters.search.trim() !== '' ||
    appliedFilters.role !== '' ||
    appliedFilters.status !== '' ||
    appliedFilters.scoreRange !== '';

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

  const loadMembers = useCallback(async () => {
    try {
      setIsMemberLoading(true);
      setErrorMessage('');

      const apiFilters = buildApiFilters(appliedFilters);
      const data = await fetchClubMembers(clubId, apiFilters);

      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('동아리원 목록을 불러오지 못했습니다.', error);
      setErrorMessage(
        getErrorMessage(error, '동아리원 목록을 불러오지 못했습니다.')
      );
    } finally {
      setIsMemberLoading(false);
    }
  }, [clubId, appliedFilters]);

  const loadJoinRequests = useCallback(async () => {
    try {
      setIsJoinRequestLoading(true);
      setJoinRequestErrorMessage('');

      const data = await fetchClubJoinRequests(clubId);
      setJoinRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('가입 신청 목록을 불러오지 못했습니다.', error);
      setJoinRequestErrorMessage(
        getErrorMessage(error, '가입 신청 목록을 불러오지 못했습니다.')
      );
    } finally {
      setIsJoinRequestLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadJoinRequests();
  }, [loadJoinRequests]);

  const handleLogout = () => {
    localStorage.removeItem('loginUser');
    navigate('/login');
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilterInputs((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setAppliedFilters(filterInputs);
  };

  const handleResetFilters = () => {
    setFilterInputs(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  };

  const handleApproveJoinRequest = async (membershipId) => {
    try {
      setProcessingRequestId(membershipId);
      setJoinRequestActionMessage('');
      setJoinRequestErrorMessage('');

      await approveClubJoinRequest(clubId, membershipId);

      setJoinRequestActionMessage('가입 신청을 승인했습니다.');

      await Promise.all([
        loadJoinRequests(),
        loadMembers(),
      ]);
    } catch (error) {
      console.error('가입 신청 승인에 실패했습니다.', error);
      setJoinRequestErrorMessage(
        getErrorMessage(error, '가입 신청 승인에 실패했습니다.')
      );
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectJoinRequest = async (membershipId) => {
    try {
      setProcessingRequestId(membershipId);
      setJoinRequestActionMessage('');
      setJoinRequestErrorMessage('');

      await rejectClubJoinRequest(clubId, membershipId);

      setJoinRequestActionMessage('가입 신청을 거절했습니다.');

      await loadJoinRequests();
    } catch (error) {
      console.error('가입 신청 거절에 실패했습니다.', error);
      setJoinRequestErrorMessage(
        getErrorMessage(error, '가입 신청 거절에 실패했습니다.')
      );
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleOpenUpdateModal = (member) => {
    setSelectedMember(member);
    setUpdateForm({
      role: member.role,
      status: member.status,
      activity_score: member.activity_score,
    });
    setUpdateErrorMessage('');
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    if (isUpdatingMember) {
      return;
    }

    setIsUpdateModalOpen(false);
    setSelectedMember(null);
    setUpdateErrorMessage('');
  };

  const handleUpdateFormChange = (event) => {
    const { name, value } = event.target;

    setUpdateForm((prevForm) => ({
      ...prevForm,
      [name]: name === 'activity_score' ? Number(value) : value,
    }));
  };

  const handleSubmitUpdateMember = async (event) => {
    event.preventDefault();

    if (!selectedMember) {
      return;
    }

    try {
      setIsUpdatingMember(true);
      setUpdateErrorMessage('');

      await updateClubMember(clubId, selectedMember.id, updateForm);

      setIsUpdateModalOpen(false);
      setSelectedMember(null);

      await loadMembers();
    } catch (error) {
      setUpdateErrorMessage(
        error.message ||
          error.activity_score?.[0] ||
          '동아리원 정보 수정에 실패했습니다.'
      );
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const summary = useMemo(() => {
    const totalCount = members.length;
    const managerCount = members.filter((member) =>
      ['president', 'vice_president'].includes(member.role)
    ).length;
    const staffCount = members.filter((member) =>
      ['executive', 'treasurer'].includes(member.role)
    ).length;
    const basicCount = members.filter((member) => member.role === 'member').length;

    return {
      totalCount,
      managerCount,
      staffCount,
      basicCount,
    };
  }, [members]);

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';

    return String(dateValue).slice(0, 10);
  };

  const getDisplayValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return value;
  };

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    role: 'member',
    status: 'new',
    activity_score: 0,
  });
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [updateErrorMessage, setUpdateErrorMessage] = useState('');

  return (
    <div className="club-dashboard-page">
      <div className="dashboard-fixed-canvas">
        <aside className="dashboard-sidebar">
          <div className="sidebar-logo">
            <Link to="/main" className="sidebar-clubflow-logo">
              <span className="sidebar-logo-cf">CM</span>
              <span className="sidebar-logo-text">Club Management</span>
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

            <Link to={`/club/${clubId}/events`} className="sidebar-link">
              <CalendarDays size={19} />
              일정·출석 관리
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

        <main className="dashboard-main club-member-main">
          <div className="dashboard-frame club-member-frame">
            <nav className="dashboard-breadcrumb">
              <Link to="/main">플랫폼 메인</Link>
              <span>›</span>
              <Link to="/main">내 동아리</Link>
              <span>›</span>
              <span>{isClubLoading ? '불러오는 중...' : club?.name || '동아리'}</span>
              <span>›</span>
              <span className="breadcrumb-current">{currentPageName}</span>
            </nav>

            <header className="dashboard-header">
              <div>
                <p className="dashboard-label">Club Members</p>
                <h1>{currentPageName}</h1>
                <p className="dashboard-desc">
                  가입 신청 승인부터 동아리원 목록 관리까지 한 화면에서 처리할 수 있습니다.
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

            <section className="summary-grid">
              <article className="summary-card">
                <div className="summary-icon members">
                  <Users size={22} />
                </div>

                <div>
                  <span>{hasActiveFilters ? '검색 결과' : '전체 동아리원'}</span>
                  <strong>{summary.totalCount}</strong>
                  <p>{hasActiveFilters ? '조건에 맞는 인원입니다.' : '관리 대상 인원입니다.'}</p>
                </div>
              </article>

              <article className="summary-card">
                <div className="summary-icon new-member">
                  <UserPlus size={22} />
                </div>

                <div>
                  <span>관리 권한</span>
                  <strong>{summary.managerCount}</strong>
                  <p>회장·부회장 역할의 회원입니다.</p>
                </div>
              </article>

              <article className="summary-card">
                <div className="summary-icon regular-member">
                  <UserCheck size={22} />
                </div>

                <div>
                  <span>운영 권한</span>
                  <strong>{summary.staffCount}</strong>
                  <p>운영진·총무 역할의 회원입니다.</p>
                </div>
              </article>

              <article className="summary-card">
                <div className="summary-icon inactive-member">
                  <UserX size={22} />
                </div>

                <div>
                  <span>일반 권한</span>
                  <strong>{summary.basicCount}</strong>
                  <p>조회 및 참여 중심의 회원입니다.</p>
                </div>
              </article>
            </section>

            <section className="club-member-content">
              <article className="club-join-request-panel">
                <div className="club-join-request-header">
                  <div>
                    <h2>가입 신청 관리</h2>
                    <p>승인 대기 중인 가입 신청을 확인하고 승인 또는 거절할 수 있습니다.</p>
                  </div>

                  <ClipboardList size={22} />
                </div>

                {joinRequestActionMessage && (
                  <div className="join-request-action-message success">
                    {joinRequestActionMessage}
                  </div>
                )}

                {joinRequestErrorMessage && (
                  <div className="join-request-action-message error">
                    {joinRequestErrorMessage}
                  </div>
                )}

                {isJoinRequestLoading ? (
                  <div className="join-request-empty-box">
                    <p>가입 신청 목록을 불러오는 중입니다.</p>
                  </div>
                ) : joinRequests.length === 0 ? (
                  <div className="join-request-empty-box">
                    <p>승인 대기 중인 가입 신청이 없습니다.</p>
                  </div>
                ) : (
                  <div className="join-request-table-wrap">
                    <div className="join-request-table">
                      <div className="join-request-table-head">
                        <span>이름</span>
                        <span>아이디</span>
                        <span>이메일</span>
                        <span>학번</span>
                        <span>학과</span>
                        <span>상태</span>
                        <span>신청일</span>
                        <span>관리</span>
                      </div>

                      {joinRequests.map((request) => (
                        <div className="join-request-table-row" key={request.id}>
                          <span className="member-name">
                            {getDisplayValue(request.name)}
                          </span>
                          <span>{getDisplayValue(request.username)}</span>
                          <span>{getDisplayValue(request.email)}</span>
                          <span>{getDisplayValue(request.student_id)}</span>
                          <span>{getDisplayValue(request.department)}</span>
                          <span>
                            <em className="join-request-badge">
                              {getDisplayValue(request.status_display || request.status)}
                            </em>
                          </span>
                          <span>{formatDate(request.joined_at)}</span>
                          <span className="join-request-action-cell">
                            <button
                              type="button"
                              className="join-request-approve-button"
                              disabled={processingRequestId === request.id}
                              onClick={() => handleApproveJoinRequest(request.id)}
                            >
                              <CheckCircle size={15} />
                              승인
                            </button>

                            <button
                              type="button"
                              className="join-request-reject-button"
                              disabled={processingRequestId === request.id}
                              onClick={() => handleRejectJoinRequest(request.id)}
                            >
                              <XCircle size={15} />
                              거절
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              <article className="club-member-panel">
                <div className="club-member-panel-header">
                  <div>
                    <h2>동아리원 목록</h2>
                    <p>
                      이름, 아이디, 이메일, 학번, 학과, 역할, 상태, 활동 점수 기준으로 동아리원을 찾을 수 있습니다.
                    </p>
                  </div>

                  <ShieldCheck size={22} />
                </div>

                <form className="club-member-filter-bar" onSubmit={handleFilterSubmit}>
                  <div className="member-search-box">
                    <Search size={17} />
                    <input
                      type="text"
                      name="search"
                      placeholder="이름, 아이디, 이메일, 학번, 학과 검색"
                      value={filterInputs.search}
                      onChange={handleFilterChange}
                    />
                  </div>

                  <select
                    name="role"
                    value={filterInputs.role}
                    onChange={handleFilterChange}
                    aria-label="역할 필터"
                  >
                    <option value="">역할 전체</option>
                    <option value="president">회장</option>
                    <option value="vice_president">부회장</option>
                    <option value="executive">운영진</option>
                    <option value="treasurer">총무</option>
                    <option value="member">일반 회원</option>
                  </select>

                  <select
                    name="status"
                    value={filterInputs.status}
                    onChange={handleFilterChange}
                    aria-label="상태 필터"
                  >
                    <option value="">상태 전체</option>
                    <option value="new">신입 회원</option>
                    <option value="regular">정회원</option>
                    <option value="inactive">휴면 회원</option>
                    <option value="withdrawn">탈퇴 회원</option>
                    <option value="fee_unpaid">회비 미납자</option>
                    <option value="restricted">이용 제한 회원</option>
                  </select>

                  <select
                    name="scoreRange"
                    value={filterInputs.scoreRange}
                    onChange={handleFilterChange}
                    aria-label="활동 점수 필터"
                  >
                    <option value="">활동 점수 전체</option>
                    <option value="80">80점 이상</option>
                    <option value="50-79">50점 이상 79점 이하</option>
                    <option value="0-49">50점 미만</option>
                  </select>

                  <button type="submit" className="member-filter-submit-button">
                    <Filter size={16} />
                    적용
                  </button>

                  <button
                    type="button"
                    className="member-filter-reset-button"
                    onClick={handleResetFilters}
                  >
                    <RotateCcw size={16} />
                    초기화
                  </button>
                </form>

                {isMemberLoading ? (
                  <div className="club-member-empty-box">
                    <p>동아리원 목록을 불러오는 중입니다.</p>
                  </div>
                ) : errorMessage ? (
                  <div className="club-member-empty-box error">
                    <p>{errorMessage}</p>
                  </div>
                ) : members.length === 0 ? (
                  <div className="club-member-empty-box">
                    <p>
                      {hasActiveFilters
                        ? '조건에 맞는 동아리원이 없습니다.'
                        : '등록된 동아리원이 없습니다.'}
                    </p>
                  </div>
                ) : (
                  <div className="club-member-table-wrap">
                    <div className="club-member-table">
                      <div className="club-member-table-head">
                        <span>이름</span>
                        <span>아이디</span>
                        <span>이메일</span>
                        <span>학번</span>
                        <span>학과</span>
                        <span>역할</span>
                        <span>권한</span>
                        <span>상태</span>
                        <span>활동 점수</span>
                        <span>활동 등급</span>
                        <span>가입일</span>
                        <span>관리</span>
                      </div>

                      {members.map((member) => (
                        <div className="club-member-table-row" key={member.id}>
                          <span className="member-name">
                            {getDisplayValue(member.name)}
                          </span>
                          <span>{getDisplayValue(member.username)}</span>
                          <span>{getDisplayValue(member.email)}</span>
                          <span>{getDisplayValue(member.student_id)}</span>
                          <span>{getDisplayValue(member.department)}</span>
                          <span>
                            <em className="member-badge role">
                              {getDisplayValue(member.role_display || member.role)}
                            </em>
                          </span>

                          <span>
                            <em className={`member-badge permission ${member.role_permission_level}`}>
                              {getDisplayValue(member.role_permission_summary)}
                            </em>
                          </span>

                          <span>
                            <em className={`member-badge status ${member.status}`}>
                              {getDisplayValue(member.status_display || member.status)}
                            </em>
                          </span>
                          <span>{member.activity_score ?? 0}점</span>
                          <span>
                            <em className={`member-badge grade ${member.activity_grade}`}>
                              {getDisplayValue(member.activity_grade_display)}
                            </em>
                          </span>
                          <span>{formatDate(member.joined_at)}</span>
                          <span className="member-action-cell">
                            <Link
                              to={`/club/${clubId}/members/${member.id}`}
                              className="member-detail-button"
                            >
                              상세
                            </Link>

                            <button
                              type="button"
                              className="member-edit-button"
                              onClick={() => handleOpenUpdateModal(member)}
                            >
                              수정
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            </section>
          </div>
        </main>
      </div>

      {isUpdateModalOpen && selectedMember && (
        <div className="member-update-modal-backdrop">
          <div className="member-update-modal">
            <div className="member-update-modal-header">
              <div>
                <h3>동아리원 정보 수정</h3>
                <p>
                  {selectedMember.name}님의 역할, 상태, 활동 점수를 수정합니다.
                </p>
              </div>

              <button
                type="button"
                className="member-update-modal-close"
                onClick={handleCloseUpdateModal}
                disabled={isUpdatingMember}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitUpdateMember} className="member-update-form">
              <label>
                역할
                <select
                  name="role"
                  value={updateForm.role}
                  onChange={handleUpdateFormChange}
                >
                  <option value="president">회장</option>
                  <option value="vice_president">부회장</option>
                  <option value="executive">운영진</option>
                  <option value="treasurer">총무</option>
                  <option value="member">일반 회원</option>
                </select>
              </label>

              <div className="member-role-permission-box">
                <strong>{getRolePermissionInfo(updateForm.role).summary}</strong>

                <ul>
                  {getRolePermissionInfo(updateForm.role).permissions.map((permission) => (
                    <li key={permission}>{permission}</li>
                  ))}
                </ul>
              </div>

              <label>
                상태
                <select
                  name="status"
                  value={updateForm.status}
                  onChange={handleUpdateFormChange}
                >
                  <option value="new">신입 회원</option>
                  <option value="regular">정회원</option>
                  <option value="inactive">휴면 회원</option>
                  <option value="withdrawn">탈퇴 회원</option>
                  <option value="fee_unpaid">회비 미납자</option>
                  <option value="restricted">이용 제한 회원</option>
                </select>
              </label>

              <label>
                활동 점수
                <input
                  type="number"
                  name="activity_score"
                  min="0"
                  max="100"
                  value={updateForm.activity_score}
                  onChange={handleUpdateFormChange}
                />
              </label>

              {updateErrorMessage && (
                <p className="member-update-error-message">
                  {updateErrorMessage}
                </p>
              )}

              <div className="member-update-modal-actions">
                <button
                  type="button"
                  className="member-update-cancel-button"
                  onClick={handleCloseUpdateModal}
                  disabled={isUpdatingMember}
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="member-update-save-button"
                  disabled={isUpdatingMember}
                >
                  {isUpdatingMember ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClubMemberListPage;