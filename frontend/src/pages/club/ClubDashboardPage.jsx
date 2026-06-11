import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getClub } from '../../api/clubs.js';
import { getFeeTransactions, getFeeSummary, getFeePayments } from '../../api/fees.js';
import { getClubHealthAnalysis } from '../../api/health.js';
import {
  fetchEvents,
  fetchLowParticipationMembers,
  fetchMemberActivitySummary,
  fetchMyEventRole,
} from '../../api/events.js';
import { fetchClubMemberNetwork } from '../../api/clubMembers.js';

import '../../styles/club/clubDashboard.css';

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CreditCard,
  Edit3,
  FileCheck2,
  FileText,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircleHeart,
  Paperclip,
  ReceiptText,
  Send,
  ShieldCheck,
  Smile,
  TrendingUp,
  Users,
  UserX,
  Wallet,
} from 'lucide-react';

function ClubDashboardPage() {
  const navigate = useNavigate();
  const { clubId } = useParams();

  const [club, setClub] = useState(null);
  const [isClubLoading, setIsClubLoading] = useState(true);

  const [noticeText, setNoticeText] = useState('');
  const [notices, setNotices] = useState([]);

  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {};

  const [eventRole, setEventRole] = useState(null);
  const [canManageDashboard, setCanManageDashboard] = useState(false);

  const [feeTransactions, setFeeTransactions] = useState([]);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState(null);
  const [feeSummary, setFeeSummary] = useState(null);
  const [feePaymentSummary, setFeePaymentSummary] = useState(null);

  const [healthData, setHealthData] = useState(null);
  const [healthSummary, setHealthSummary] = useState(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  const [events, setEvents] = useState([]);
  const [isEventLoading, setIsEventLoading] = useState(false);

  const [activityData, setActivityData] = useState(null);
  const [lowParticipationData, setLowParticipationData] = useState(null);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  const [networkData, setNetworkData] = useState(null);
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);

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

  useEffect(() => {
    const loadDashboardFeeData = async () => {
      if (!clubId) return;

      try {
        setIsFeeLoading(true);

        const [summaryData, paymentData, transactionData] = await Promise.all([
          getFeeSummary(clubId),
          getFeePayments(clubId),
          getFeeTransactions(clubId, { limit: 'all' }),
        ]);

        setFeeSummary(summaryData || null);
        setFeePaymentSummary(paymentData?.summary || null);
        setFeeTransactions(transactionData?.results || []);
      } catch (error) {
        console.error('대시보드 회비 데이터 조회 실패:', error);
        setFeeSummary(null);
        setFeePaymentSummary(null);
        setFeeTransactions([]);
      } finally {
        setIsFeeLoading(false);
      }
    };

    loadDashboardFeeData();
  }, [clubId]);

  useEffect(() => {
    const loadDashboardHealthData = async () => {
      if (!clubId) return;

      try {
        setIsHealthLoading(true);
        const data = await getClubHealthAnalysis(clubId);

        setHealthData(data || null);
        setHealthSummary(data?.totalHealth || null);
      } catch (error) {
        console.error('대시보드 건강도 데이터 조회 실패:', error);
        setHealthData(null);
        setHealthSummary(null);
      } finally {
        setIsHealthLoading(false);
      }
    };

    loadDashboardHealthData();
  }, [clubId]);

  useEffect(() => {
    const loadDashboardEvents = async () => {
      if (!clubId) return;

      try {
        setIsEventLoading(true);
        const data = await fetchEvents(clubId);
        setEvents(Array.isArray(data?.results) ? data.results : []);
      } catch (error) {
        console.error('대시보드 일정 데이터 조회 실패:', error);
        setEvents([]);
      } finally {
        setIsEventLoading(false);
      }
    };

    loadDashboardEvents();
  }, [clubId]);

  useEffect(() => {
    const loadDashboardActivityData = async () => {
      if (!clubId) return;

      try {
        setIsActivityLoading(true);
        const [summaryData, lowData] = await Promise.all([
          fetchMemberActivitySummary(clubId),
          fetchLowParticipationMembers(clubId),
        ]);

        setActivityData(summaryData || null);
        setLowParticipationData(lowData || null);
      } catch (error) {
        console.error('대시보드 활동 점수 데이터 조회 실패:', error);
        setActivityData(null);
        setLowParticipationData(null);
      } finally {
        setIsActivityLoading(false);
      }
    };

    loadDashboardActivityData();
  }, [clubId]);

  useEffect(() => {
    const loadDashboardNetworkData = async () => {
      if (!clubId) return;

      try {
        setIsNetworkLoading(true);
        const data = await fetchClubMemberNetwork(clubId);
        setNetworkData(data || null);
      } catch (error) {
        console.error('대시보드 참여 연결도 데이터 조회 실패:', error);
        setNetworkData(null);
      } finally {
        setIsNetworkLoading(false);
      }
    };

  loadDashboardNetworkData();
  }, [clubId]);

    useEffect(() => {
    const loadDashboardRole = async () => {
      if (!clubId) return;

      try {
        const data = await fetchMyEventRole(clubId);

        setEventRole(data || null);
        setCanManageDashboard(Boolean(data?.can_manage_events));
      } catch (error) {
        console.error('대시보드 권한 확인 실패:', error);
        setEventRole(null);
        setCanManageDashboard(false);
      }
    };

    loadDashboardRole();
  }, [clubId]);

  const handleLogout = () => {
    localStorage.removeItem('loginUser');
    navigate('/login');
  };

  const handleAddNotice = () => {
    if (!canManageDashboard) {
      alert('공지사항 등록은 운영진만 가능합니다.');
      return;
    }

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

  const formatDashboardWon = (amount) => {
    const numericAmount = Number(amount || 0);
    return `${numericAmount.toLocaleString('ko-KR')}원`;
  };

  const formatDashboardDateTime = (value) => {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 16).replace('T', ' ');
    }

    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const monthlyFeeStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const monthlyTransactions = feeTransactions.filter((transaction) => {
      if (!transaction.date) return false;

      const [year, month] = String(transaction.date).split('-').map(Number);
      return year === currentYear && month === currentMonth;
    });

    const incomeCount = monthlyTransactions.filter(
      (transaction) => transaction.type === '수입',
    ).length;

    const expenseCount = monthlyTransactions.filter(
      (transaction) => transaction.type === '지출',
    ).length;

    const receiptTargetCount = monthlyTransactions.length;
    const receiptAttachedCount = monthlyTransactions.filter(
      (transaction) => transaction.receipts?.length > 0,
    ).length;

    const receiptRate = receiptTargetCount
      ? Math.round((receiptAttachedCount / receiptTargetCount) * 100)
      : 0;

    return {
      monthlyTransactions,
      incomeCount,
      expenseCount,
      receiptTargetCount,
      receiptAttachedCount,
      receiptRate,
    };
  }, [feeTransactions]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();

    return events
      .filter((event) => event.status === 'scheduled')
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
      .filter((event) => new Date(event.start_at) >= now)
      .slice(0, 4);
  }, [events]);

  const recentCompletedEvents = useMemo(() => {
    return events
      .filter((event) => event.status === 'completed')
      .sort((a, b) => new Date(b.start_at) - new Date(a.start_at))
      .slice(0, 2);
  }, [events]);

  const activitySummary = activityData?.summary || {};
  const lowMembers = lowParticipationData?.results || [];
  const activityRiskPreview = lowMembers.slice(0, 3);

  const networkSummary = networkData?.summary || {};
  const networkMembers = networkData?.members || [];
  const networkRiskMembers = networkMembers
    .filter((member) => ['risk', 'watch'].includes(member.connection_state))
    .sort((a, b) => Number(a.connection_score || 0) - Number(b.connection_score || 0))
    .slice(0, 3);

  const domainScores = (healthData?.domainScores || []).filter(
    (item) => item.key !== 'satisfaction',
  );

  const finalComment = healthData?.finalComment || null;

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
            <Link to={`/club/${clubId}/dashboard`} className="sidebar-link active">
              <LayoutDashboard size={19} />
              대시보드
            </Link>

            <div className="sidebar-menu-group">
              <Link to={`/club/${clubId}/info`} className="sidebar-link sidebar-parent-link">
                <FileText size={19} />
                동아리 정보
              </Link>

              {canManageDashboard && (
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

            <Link to={`/club/${clubId}/events`} className="sidebar-link">
              <CalendarDays size={19} />
              일정·출석 관리
            </Link>

            <Link to={`/club/${clubId}/survey`} className="sidebar-link">
              <MessageCircleHeart size={19} />
              만족도 조사
            </Link>

            <Link to={`/club/${clubId}/health`} className="sidebar-link">
              <HeartPulse size={19} />
              건강도 분석
            </Link>
          </nav>

          <button type="button" className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            로그아웃
          </button>
        </aside>

        <main className="dashboard-main">
          <div className="dashboard-frame dashboard-integrated-frame">
            <nav className="dashboard-breadcrumb">
              <Link to="/main">플랫폼 메인</Link>
              <span>›</span>
              <Link to="/main">내 동아리</Link>
              <span>›</span>
              <span>{isClubLoading ? '불러오는 중...' : club?.name || '동아리'}</span>
              <span>›</span>
              <span className="breadcrumb-current">대시보드</span>
            </nav>

            <header className="dashboard-header">
              <div>
                <p className="dashboard-label">Dashboard</p>
                <h1>동아리 운영 대시보드</h1>
                <p className="dashboard-desc">
                  일정, 회비, 활동 점수, 참여 연결도, 건강도 데이터를 한 화면에서 확인합니다.
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
                  <strong>
                    {isHealthLoading
                      ? '-'
                      : healthSummary
                        ? `${healthSummary.score}점`
                        : '-'}
                  </strong>
                  <p>
                    {isHealthLoading
                      ? '불러오는 중입니다.'
                      : healthSummary
                        ? `${healthSummary.status} / ${healthSummary.maxScore}점 만점`
                        : '건강도 데이터가 없습니다.'}
                  </p>
                </div>
              </article>

              <article className="summary-card">
                <div className="summary-icon balance">
                  <Wallet size={22} />
                </div>

                <div>
                  <span>회비 잔액</span>
                  <strong>
                    {isFeeLoading ? '-' : formatDashboardWon(feeSummary?.balance ?? 0)}
                  </strong>
                  <p>현재 회비의 잔액입니다.</p>
                </div>
              </article>

              <article className="summary-card">
                <div className="summary-icon unpaid">
                  <UserX size={22} />
                </div>

                <div>
                  <span>미납 인원</span>
                  <strong>
                    {isFeeLoading ? '-' : `${feePaymentSummary?.unpaidMemberCount ?? 0}명`}
                  </strong>
                  <p>전체 {feePaymentSummary?.totalMemberCount ?? 0}명 중 미납</p>
                </div>
              </article>
            </section>

            <section className="dashboard-content-grid dashboard-integrated-grid">
              <article className="dashboard-panel notice-panel">
                <div className="panel-title-row">
                  <div>
                    <h2>공지사항</h2>
                    <p>운영진이 임시 공지를 등록하고 확인하는 영역입니다.</p>
                  </div>

                  <Megaphone size={21} />
                </div>

                <div className="notice-body">
                  <div className="notice-list">
                    {notices.length === 0 ? (
                      <div className="notice-empty-box">
                        <div className="empty-icon">
                          <Megaphone size={26} />
                        </div>

                        <h3>등록된 공지사항이 없습니다.</h3>
                        <p>아래 입력창에 공지사항을 입력하면 이 영역에 바로 표시됩니다.</p>
                      </div>
                    ) : (
                      notices.map((notice) => (
                        <div className="notice-item" key={notice.id}>
                          <div className="notice-item-icon">
                            <Megaphone size={17} />
                          </div>

                          <div>
                            <p>{notice.content}</p>
                            <span>{notice.createdAt}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {canManageDashboard ? (
                    <div className="notice-input-row">
                      <div className="notice-input-box">
                        <input
                          type="text"
                          placeholder="공지사항을 입력하세요..."
                          value={noticeText}
                          onChange={(event) => setNoticeText(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              handleAddNotice();
                            }
                          }}
                        />

                        <button type="button" className="notice-icon-button">
                          <Paperclip size={20} />
                        </button>

                        <button type="button" className="notice-icon-button">
                          <Smile size={20} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="notice-submit-button"
                        onClick={handleAddNotice}
                      >
                        <Send size={18} />
                        공지 등록
                      </button>
                    </div>
                  ) : (
                    <div className="notice-member-guide">
                      <p>공지사항 등록은 운영진만 가능합니다.</p>
                    </div>
                  )}
                </div>
              </article>

              <article className="dashboard-panel activity-panel dashboard-event-panel">
                <div className="panel-title-row">
                  <div>
                    <h2>활동 일정</h2>
                    <p>일정·출석 관리에 등록된 예정/완료 일정을 요약합니다.</p>
                  </div>

                  <CalendarDays size={21} />
                </div>

                {isEventLoading ? (
                  <div className="empty-panel">
                    <p>활동 일정을 불러오는 중입니다.</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="empty-panel">
                    <p>등록된 활동 일정이 없습니다.</p>
                  </div>
                ) : (
                  <div className="dashboard-event-content">
                    <div className="dashboard-kpi-grid event-kpi-grid">
                      <div className="dashboard-kpi-card">
                        <span>전체 일정</span>
                        <strong>{events.length}개</strong>
                      </div>
                      <div className="dashboard-kpi-card scheduled">
                        <span>예정</span>
                        <strong>{events.filter((event) => event.status === 'scheduled').length}개</strong>
                      </div>
                      <div className="dashboard-kpi-card completed">
                        <span>완료</span>
                        <strong>{events.filter((event) => event.status === 'completed').length}개</strong>
                      </div>
                      <div className="dashboard-kpi-card canceled">
                        <span>취소</span>
                        <strong>{events.filter((event) => event.status === 'canceled').length}개</strong>
                      </div>
                    </div>

                    <div className="dashboard-event-columns">
                      <div>
                        <h3>다가오는 일정</h3>
                        {upcomingEvents.length === 0 ? (
                          <p className="dashboard-muted-text">예정된 일정이 없습니다.</p>
                        ) : (
                          <div className="dashboard-event-list">
                            {upcomingEvents.map((event) => (
                              <div className="dashboard-event-item" key={event.id}>
                                <div>
                                  <strong>{event.title}</strong>
                                  <p>{event.event_type_display || event.event_type} · {event.location || '장소 미정'}</p>
                                </div>
                                <span>{formatDashboardDateTime(event.start_at)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3>최근 완료 일정</h3>
                        {recentCompletedEvents.length === 0 ? (
                          <p className="dashboard-muted-text">완료된 일정이 없습니다.</p>
                        ) : (
                          <div className="dashboard-event-list compact">
                            {recentCompletedEvents.map((event) => (
                              <div className="dashboard-event-item" key={event.id}>
                                <div>
                                  <strong>{event.title}</strong>
                                  <p>{event.status_display || '완료'}</p>
                                </div>
                                <span>{formatDashboardDateTime(event.start_at)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>

              <article className="dashboard-panel activity-score-panel">
                <div className="panel-title-row">
                  <div>
                    <h2>활동 점수 요약</h2>
                    <p>KAN-66 활동 점수 자동 계산 결과입니다.</p>
                  </div>

                  <Activity size={21} />
                </div>

                {isActivityLoading ? (
                  <div className="empty-panel">
                    <p>활동 점수 데이터를 불러오는 중입니다.</p>
                  </div>
                ) : !activityData ? (
                  <div className="empty-panel">
                    <p>활동 점수 데이터가 없습니다.</p>
                  </div>
                ) : (
                  <div className="dashboard-analysis-box">
                    <div className="dashboard-analysis-main-score">
                      <span>평균 활동 점수</span>
                      <strong>{activitySummary.average_activity_score ?? 0}점</strong>
                      <p>{activityData?.score_policy?.formula}</p>
                    </div>

                    <div className="dashboard-mini-stat-grid">
                      <div>
                        <span>저활동 관리 대상</span>
                        <strong>{activitySummary.low_participation_count ?? 0}명</strong>
                      </div>
                      <div>
                        <span>위험</span>
                        <strong>{activitySummary.danger_count ?? 0}명</strong>
                      </div>
                      <div>
                        <span>관찰 필요</span>
                        <strong>{activitySummary.watch_count ?? 0}명</strong>
                      </div>
                      <div>
                        <span>데이터 부족</span>
                        <strong>{activitySummary.data_insufficient_count ?? 0}명</strong>
                      </div>
                    </div>

                    <div className="dashboard-risk-list">
                      {activityRiskPreview.length === 0 ? (
                        <p className="dashboard-muted-text">저활동 위험 신호가 없습니다.</p>
                      ) : (
                        activityRiskPreview.map((member) => (
                          <div className="dashboard-risk-item" key={member.membership_id}>
                            <div>
                              <strong>{member.user_real_name}</strong>
                              <p>{member.risk_summary}</p>
                            </div>
                            <em className={`dashboard-risk-badge ${member.risk_level}`}>
                              {member.risk_level_display}
                            </em>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </article>

              <article className="dashboard-panel network-summary-panel">
                <div className="panel-title-row">
                  <div>
                    <h2>참여 연결도 요약</h2>
                    <p>KAN-72 공동 참여 관계 분석 결과입니다.</p>
                  </div>

                  <GitBranch size={21} />
                </div>

                {isNetworkLoading ? (
                  <div className="empty-panel">
                    <p>참여 연결도 데이터를 불러오는 중입니다.</p>
                  </div>
                ) : !networkData ? (
                  <div className="empty-panel">
                    <p>참여 연결도 데이터가 없습니다.</p>
                  </div>
                ) : (
                  <div className="dashboard-analysis-box">
                    <div className="dashboard-analysis-main-score network">
                      <span>평균 연결 점수</span>
                      <strong>{networkSummary.average_score ?? 0}점</strong>
                      <p>분석 일정 {networkSummary.analyzed_event_count ?? 0}개 기준</p>
                    </div>

                    <div className="dashboard-mini-stat-grid">
                      <div>
                        <span>저연결 위험</span>
                        <strong>{networkSummary.risk_count ?? 0}명</strong>
                      </div>
                      <div>
                        <span>관찰 필요</span>
                        <strong>{networkSummary.watch_count ?? 0}명</strong>
                      </div>
                      <div>
                        <span>분석 회원</span>
                        <strong>{networkSummary.total_member_count ?? networkMembers.length}명</strong>
                      </div>
                      <div>
                        <span>관계 수</span>
                        <strong>{networkData?.relations?.length ?? 0}개</strong>
                      </div>
                    </div>

                    <div className="dashboard-risk-list">
                      {networkRiskMembers.length === 0 ? (
                        <p className="dashboard-muted-text">저연결 위험 회원이 없습니다.</p>
                      ) : (
                        networkRiskMembers.map((member) => (
                          <div className="dashboard-risk-item" key={member.membership_id}>
                            <div>
                              <strong>{member.name}</strong>
                              <p>{member.reasons?.[0] || '추가 확인이 필요합니다.'}</p>
                            </div>
                            <em className={`dashboard-risk-badge ${member.connection_state}`}>
                              {member.connection_state_display}
                            </em>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </article>

              <article className="dashboard-panel health-mini-panel">
                <div className="panel-title-row">
                  <div>
                    <h2>건강도 요약</h2>
                    <p>건강도 분석 페이지의 영역별 점수를 요약합니다.</p>
                  </div>

                  <BarChart3 size={21} />
                </div>

                {isHealthLoading ? (
                  <div className="empty-panel">
                    <p>건강도 데이터를 불러오는 중입니다.</p>
                  </div>
                ) : !healthData ? (
                  <div className="empty-panel">
                    <p>건강도 데이터가 없습니다.</p>
                  </div>
                ) : (
                  <div className="dashboard-health-summary-box">
                    <div className="dashboard-health-total-row">
                      <div>
                        <span>전체 건강도</span>
                        <strong>{healthSummary?.score ?? 0}점</strong>
                      </div>
                      <em>{healthSummary?.status || '데이터 없음'}</em>
                    </div>

                    <div className="dashboard-health-domain-list">
                      {domainScores.map((domain) => (
                        <div className="dashboard-health-domain-item" key={domain.key}>
                          <div>
                            <strong>{domain.title}</strong>
                            <p>{domain.description}</p>
                          </div>
                          <span>{domain.dataReady ? `${domain.score}점` : '-'}</span>
                        </div>
                      ))}
                    </div>

                    <div className="dashboard-health-comment">
                      <ShieldCheck size={16} />
                      <p>
                        {finalComment?.summary ||
                          '회원, 일정, 회비 데이터를 누적하면 최종 평가 코멘트가 표시됩니다.'}
                      </p>
                    </div>
                  </div>
                )}
              </article>

              <article className="dashboard-panel fee-panel">
                <div className="panel-title-row dashboard-fee-title-row">
                  <div>
                    <h2>회비 관리</h2>
                    <p>이번 달 수입·지출 건수와 증빙 현황입니다.</p>
                  </div>

                  <button
                    type="button"
                    className="dashboard-fee-detail-button"
                    onClick={() => setIsFeeModalOpen(true)}
                    disabled={isFeeLoading}
                  >
                    수입/지출 내역 보기
                  </button>
                </div>

                {isFeeLoading ? (
                  <div className="empty-panel">
                    <p>회비 데이터를 불러오는 중입니다.</p>
                  </div>
                ) : feeTransactions.length === 0 ? (
                  <div className="empty-panel">
                    <p>등록된 회비 내역이 없습니다.</p>
                  </div>
                ) : (
                  <div className="dashboard-fee-preview">
                    <div className="dashboard-fee-count-grid">
                      <div className="dashboard-fee-count-card income">
                        <div className="dashboard-fee-count-icon">
                          <Wallet size={22} />
                          <ArrowUpRight size={15} className="dashboard-fee-corner-icon" />
                        </div>

                        <div>
                          <span>수입</span>
                          <strong>{monthlyFeeStats.incomeCount}건</strong>
                        </div>
                      </div>

                      <div className="dashboard-fee-count-card expense">
                        <div className="dashboard-fee-count-icon">
                          <ReceiptText size={22} />
                          <ArrowDownRight size={15} className="dashboard-fee-corner-icon" />
                        </div>

                        <div>
                          <span>지출</span>
                          <strong>{monthlyFeeStats.expenseCount}건</strong>
                        </div>
                      </div>
                    </div>

                    <div className="dashboard-receipt-rate-box">
                      <div
                        className="dashboard-receipt-chart"
                        style={{
                          background: `conic-gradient(
                            #4f63e7 0deg ${monthlyFeeStats.receiptRate * 3.6}deg,
                            #e5e7eb ${monthlyFeeStats.receiptRate * 3.6}deg 360deg
                          )`,
                        }}
                      >
                        <div className="dashboard-receipt-chart-inner">
                          {monthlyFeeStats.receiptRate}%
                        </div>
                      </div>

                      <div className="dashboard-receipt-text">
                        <div className="dashboard-receipt-title">
                          <FileCheck2 size={17} />
                          <span>증빙자료 첨부율</span>
                        </div>

                        {monthlyFeeStats.receiptTargetCount > 0 ? (
                          <strong>
                            수입/지출 {monthlyFeeStats.receiptTargetCount}건 중{' '}
                            {monthlyFeeStats.receiptAttachedCount}건 첨부
                          </strong>
                        ) : (
                          <strong>이번 달 수입/지출 내역이 없습니다.</strong>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            </section>

            {isFeeModalOpen && (
              <div
                className="dashboard-modal-backdrop"
                onClick={() => setIsFeeModalOpen(false)}
              >
                <div
                  className="dashboard-transaction-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="dashboard-modal-header">
                    <h3>전체 수입 / 지출 내역</h3>

                    <button type="button" onClick={() => setIsFeeModalOpen(false)}>
                      닫기
                    </button>
                  </div>

                  <div className="dashboard-transaction-table-wrap">
                    <table className="dashboard-transaction-table">
                      <thead>
                        <tr>
                          <th>날짜</th>
                          <th>구분</th>
                          <th>내용</th>
                          <th>카테고리</th>
                          <th>금액</th>
                          <th>관련 대상</th>
                          <th>메모</th>
                          <th>증빙자료</th>
                        </tr>
                      </thead>

                      <tbody>
                        {feeTransactions.length > 0 ? (
                          feeTransactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td>{transaction.date}</td>

                              <td>
                                <span
                                  className={`dashboard-transaction-badge ${
                                    transaction.type === '수입' ? 'income' : 'expense'
                                  }`}
                                >
                                  {transaction.type}
                                </span>
                              </td>

                              <td>{transaction.content}</td>
                              <td>{transaction.category}</td>

                              <td
                                className={`dashboard-amount ${
                                  transaction.amount > 0 ? 'income' : 'expense'
                                }`}
                              >
                                {transaction.amount > 0 ? '+' : ''}
                                {formatDashboardWon(transaction.amount)}
                              </td>

                              <td>{transaction.target || '-'}</td>
                              <td className="dashboard-transaction-memo-cell">
                                {transaction.memo || '-'}
                              </td>

                              <td>
                                {transaction.receipts?.length > 0 ? (
                                  <button
                                    type="button"
                                    className="dashboard-receipt-open-button"
                                    onClick={() => setSelectedReceipts(transaction.receipts)}
                                  >
                                    첨부 {transaction.receipts.length}개
                                  </button>
                                ) : (
                                  <span className="dashboard-receipt-empty">미첨부</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8">등록된 수입 / 지출 내역이 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedReceipts && (
              <div
                className="dashboard-modal-backdrop"
                onClick={() => setSelectedReceipts(null)}
              >
                <div
                  className="dashboard-receipt-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="dashboard-modal-header">
                    <h3>영수증 증빙 자료</h3>

                    <button type="button" onClick={() => setSelectedReceipts(null)}>
                      닫기
                    </button>
                  </div>

                  <div className="dashboard-receipt-preview-list">
                    {selectedReceipts.map((receipt) => {
                      const receiptName = receipt.name || '';
                      const receiptUrl = receipt.url || '';
                      const isPdf = receiptName.toLowerCase().endsWith('.pdf');

                      return (
                        <div key={receipt.id} className="dashboard-receipt-preview-item">
                          <p>{receiptName}</p>

                          {isPdf ? (
                            <iframe
                              src={receiptUrl}
                              title={receiptName}
                              className="dashboard-receipt-pdf-preview"
                            />
                          ) : (
                            <img
                              src={receiptUrl}
                              alt={receiptName}
                              className="dashboard-receipt-image-preview"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ClubDashboardPage;
