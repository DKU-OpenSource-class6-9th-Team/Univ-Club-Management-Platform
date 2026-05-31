import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getClub } from '../../api/clubs.js'
import { getClubHealthAnalysis } from '../../api/health.js'

import '../../styles/club/clubDashboard.css'
import '../../styles/club/clubHealth.css'

import {
  AlertTriangle,
  Bell,
  Bot,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Download,
  Edit3,
  FileText,
  HeartPulse,
  Info,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageCircleHeart,
  ShieldCheck,
  Star,
  ThumbsUp,
  Users,
  Wallet,
} from 'lucide-react'

function ClubHealthPage() {
  const navigate = useNavigate()
  const { clubId } = useParams()

  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {}
  const isClubManager = loginUser.role === 'CLUB_MANAGER'

  const [club, setClub] = useState(null)
  const [healthData, setHealthData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const [clubData, healthAnalysisData] = await Promise.all([
          getClub(clubId),
          getClubHealthAnalysis(clubId),
        ])

        setClub(clubData)
        setHealthData(healthAnalysisData)
      } catch (error) {
        console.error('건강도 분석 데이터를 불러오지 못했습니다.', error)
        setErrorMessage(
          error?.message || '건강도 분석 데이터를 불러오지 못했습니다.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchPageData()
  }, [clubId])

  const handleLogout = () => {
    localStorage.removeItem('loginUser')
    navigate('/login')
  }

  // 상태 라벨에 따라 배지 색상 클래스를 결정한다.
  const getHealthStatusClass = (status) => {
    if (status === '매우 우수' || status === '양호' || status === '안정') {
      return 'good'
    }

    if (status === '보통' || status === '구현 예정' || status === '데이터 없음') {
      return 'normal'
    }

    return 'warning'
  }

  // 전체 건강도 원형 차트 색상을 점수 구간에 따라 결정한다.
  const getScoreRangeColor = (score) => {
    if (
      score === null ||
      score === undefined ||
      score === '-' ||
      Number.isNaN(Number(score))
    ) {
      return '#d1d5db'
    }

    const numericScore = Number(score)

    if (numericScore >= 90) return '#2563eb'
    if (numericScore >= 70) return '#22c55e'
    if (numericScore >= 50) return '#f59e0b'

    return '#ef4444'
  }

  // 0~100 범위를 벗어나지 않도록 점수를 보정한다.
  const safeScore = (value) => {
    const numericValue = Number(value || 0)

    if (numericValue < 0) return 0
    if (numericValue > 100) return 100

    return numericValue
  }

  // 상단 요약 카드 아이콘을 카드 key에 따라 결정한다.
  const renderSummaryIcon = (key) => {
    if (key === 'member') return <Users size={26} />
    if (key === 'schedule') return <CalendarDays size={26} />
    if (key === 'finance') return <Wallet size={26} />

    return <HeartPulse size={26} />
  }

  // 만족도 평균을 별점 형태로 표시한다.
  const renderStars = (score) => {
    const numericScore = Math.min(Math.max(Number(score) || 0, 0), 5)

    return (
      <div className="health-star-row" aria-label={`${numericScore} / 5`}>
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const fillPercent =
            Math.min(Math.max(numericScore - starIndex, 0), 1) * 100

          return (
            <span
              key={starIndex}
              className="health-star"
              style={{ '--star-fill': `${fillPercent}%` }}
              aria-hidden="true"
            >
              <Star
                className="health-star-base"
                size={19}
                strokeWidth={0}
                fill="currentColor"
              />
              <span className="health-star-fill">
                <Star size={19} strokeWidth={0} fill="currentColor" />
              </span>
            </span>
          )
        })}
      </div>
    )
  }

  // 데이터가 준비되지 않은 요약 카드는 '-'로 표시한다.
  const getSummaryScoreText = (card) => {
    if (!card.dataReady && card.key !== 'total') {
      return '-'
    }

    return card.score
  }

  // 건강도 상세 현황 값 표시 형식
  const formatIndicatorValue = (indicator) => {
    if (!indicator.dataReady) {
      return indicator.valueText || '데이터 없음'
    }

    if (indicator.unit === '%') {
      return `${indicator.value}%`
    }

    if (indicator.unit === '/5.0') {
      return `${indicator.value} / 5.0`
    }

    return `${indicator.value}${indicator.unit || ''}`
  }

  const getIndicatorStatusText = (indicator) => {
    if (indicator.dataReady) {
      return indicator.status
    }

    return indicator.status || '데이터 없음'
  }

  // 응답률 원형 그래프에 사용할 값을 0~100 범위로 보정한다.
  const getResponseRate = (value) => {
    return safeScore(value)
  }

  if (isLoading) {
    return (
      <div className="club-dashboard-page">
        <div className="club-survey-loading">
          건강도 분석 데이터를 불러오는 중입니다...
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="club-dashboard-page">
        <div className="club-survey-loading">{errorMessage}</div>
      </div>
    )
  }

  if (!healthData) {
    return (
      <div className="club-dashboard-page">
        <div className="club-survey-loading">
          건강도 분석 데이터가 없습니다.
        </div>
      </div>
    )
  }

  const totalHealth = healthData.totalHealth || {
    score: 0,
    maxScore: 100,
    status: '데이터 없음',
  }

  const totalHealthScore = safeScore(totalHealth.score)
  const totalHealthCircleColor = getScoreRangeColor(totalHealthScore)
  // 만족도 데이터는 활동/일정 운영성과 재정 운영 투명성 계산에 흡수
  const summaryCards = (healthData.summaryCards || []).filter(
    (card) => card.key !== 'satisfaction',
 )
  const domainScores = (healthData.domainScores || []).filter(
    (item) => item.key !== 'satisfaction',
  )
  const impactIndicators = healthData.impactIndicators || []
  const satisfactionSummary = healthData.satisfactionSummary || {}
  const responseRate = getResponseRate(satisfactionSummary.responseRate)

  const aiNotice = healthData.aiNotice || {
    items: [],
    description: 'AI 이상 탐지는 추후 Isolation Forest 모델을 연결할 예정입니다.',
  }

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

            <Link to={`/club/${clubId}/members`} className="sidebar-link">
              <Users size={19} />
              동아리원 관리
            </Link>

            <Link to={`/club/${clubId}/fee`} className="sidebar-link">
              <CreditCard size={19} />
              회비 관리
            </Link>

            <Link to={`/club/${clubId}/schedule`} className="sidebar-link">
              <CalendarDays size={19} />
              일정 관리 / 공지
            </Link>

            <Link to={`/club/${clubId}/survey`} className="sidebar-link">
              <MessageCircleHeart size={19} />
              만족도 조사
            </Link>

            <Link to={`/club/${clubId}/health`} className="sidebar-link active">
              <HeartPulse size={19} />
              건강도 분석
            </Link>
          </nav>

          <button type="button" className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            로그아웃
          </button>
        </aside>

        <main className="dashboard-main club-health-main">
          <div className="dashboard-frame club-health-frame">
            <nav className="dashboard-breadcrumb">
              <Link to="/main">플랫폼 메인</Link>
              <span>›</span>
              <Link to="/main">내 동아리</Link>
              <span>›</span>
              <span>{club?.name || '동아리'}</span>
              <span>›</span>
              <span className="breadcrumb-current">건강도 분석</span>
            </nav>

            <header className="dashboard-header">
              <div>
                <p className="dashboard-label">Health Analysis</p>
                <h1>동아리 운영 건강도 분석</h1>
                <p className="dashboard-desc">
                  회원, 일정, 회비, 만족도 데이터를 종합하여 동아리 운영 상태를 분석합니다.
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
                    <span>{loginUser.school_name || '단국대학교'}</span>
                  </div>
                </div>
              </div>
            </header>

            <section className="health-toolbar-row">
              <div />

              <div className="health-toolbar-actions">
                <button type="button" className="health-toolbar-button">
                  <CalendarDays size={16} />
                  2024년 5월
                  <ChevronDown size={15} />
                </button>

                <button type="button" className="health-toolbar-button">
                  <Download size={16} />
                  분석 리포트 다운로드
                </button>
              </div>
            </section>

            <section className="health-summary-grid">
              {summaryCards.map((card) => (
                <article className="health-summary-card" key={card.key}>
                  <div className={`health-summary-icon ${card.key}`}>
                    {renderSummaryIcon(card.key)}
                  </div>

                  <div className="health-summary-content">
                    <div className="health-summary-title">
                      <span>{card.title}</span>
                      {card.key === 'total' && <Info size={13} />}
                    </div>

                    <strong>
                      {getSummaryScoreText(card)}
                      <small> / {card.maxScore}점</small>
                    </strong>

                    <em
                      className={`health-badge ${getHealthStatusClass(
                        card.status,
                      )}`}
                    >
                      {card.status}
                    </em>
                  </div>
                </article>
              ))}
            </section>

            <section className="health-content-grid">
              <article className="health-panel total-health-panel">
                <div className="health-panel-title">
                  <h2>전체 건강도</h2>
                  <Info size={16} />
                </div>

                <div className="health-total-circle-wrap">
                  <div
                    className="health-total-circle"
                    style={{
                      background: `conic-gradient(
                        ${totalHealthCircleColor} 0deg,
                        ${totalHealthCircleColor} ${totalHealthScore * 3.6}deg,
                        #e5e7eb ${totalHealthScore * 3.6}deg,
                        #e5e7eb 360deg
                      )`,
                    }}
                  >
                    <div className="health-total-circle-inner">
                      <strong>{totalHealthScore}</strong>
                      <span>/ 100</span>
                    </div>
                  </div>

                  <em
                    className={`health-badge ${getHealthStatusClass(
                      totalHealth.status,
                    )}`}
                  >
                    {totalHealth.status}
                  </em>
                </div>

                <div className="health-score-guide">
                  <h3>점수 가이드</h3>

                  <p>
                    <i className="guide-dot excellent" />
                    <strong>90 ~ 100점</strong>
                    매우 우수, 전반적으로 안정적입니다.
                  </p>

                  <p>
                    <i className="guide-dot good" />
                    <strong>70 ~ 89점</strong>
                    우수, 전반적으로 잘 운영 가능합니다.
                  </p>

                  <p>
                    <i className="guide-dot normal" />
                    <strong>50 ~ 69점</strong>
                    보통, 일부 개선이 필요합니다.
                  </p>

                  <p>
                    <i className="guide-dot warning" />
                    <strong>0 ~ 49점</strong>
                    미흡, 집중적인 개선이 필요합니다.
                  </p>
                </div>
              </article>

              <article className="health-panel domain-score-panel">
                <div className="health-panel-title">
                  <h2>영역별 점수</h2>
                  <ShieldCheck size={16} />
                </div>

                <div className="domain-score-list">
                  {domainScores.map((item) => (
                    <div className={`domain-score-item ${item.key}`} key={item.key}>
                      <div className="domain-score-top">
                        <span>{item.title}</span>
                        <strong>
                          {item.dataReady ? item.score : '-'}
                          <small> / {item.maxScore}</small>
                        </strong>
                      </div>

                      <div className="domain-score-bar">
                        <div
                          style={{
                            width: `${item.dataReady ? item.score : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="health-info-box">
                  만족도 데이터는 일정 운영성과 재정 운영 투명성 점수에 반영됩니다.
                </div>
              </article>

              <article className="health-panel finance-detail-panel">
                <div className="health-panel-title">
                  <h2>건강도 상세 현황</h2>
                  <Info size={16} />
                </div>

                <div className="finance-health-list">
                  {impactIndicators.map((indicator) => (
                    <div key={indicator.key}>
                      <div className="health-detail-label">
                        <span>{indicator.title}</span>
                        {indicator.description && <p>{indicator.description}</p>}
                      </div>

                      <strong>{formatIndicatorValue(indicator)}</strong>

                      <em
                        className={`health-badge ${getHealthStatusClass(
                          getIndicatorStatusText(indicator),
                        )}`}
                      >
                        {getIndicatorStatusText(indicator)}
                      </em>
                    </div>
                  ))}
                </div>
              </article>

              <article className="health-panel ai-notice-panel">
                <div className="health-panel-title">
                  <h2>AI 이상 탐지 Notice</h2>
                  <Bot size={16} />
                </div>

                <div className="ai-notice-list">
                  {aiNotice.items.length === 0 ? (
                    <div className="ai-notice-empty">
                      <Bot size={22} />
                      <div>
                        <strong>AI 모델 연동 예정</strong>
                        <p>{aiNotice.description}</p>
                      </div>
                    </div>
                  ) : (
                    aiNotice.items.map((notice, index) => (
                      <div
                        className={`ai-notice-item ${notice.severity}`}
                        key={index}
                      >
                        <AlertTriangle size={22} />

                        <div>
                          <strong>{notice.title}</strong>
                          <p>{notice.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="health-panel satisfaction-summary-panel">
                <div className="health-panel-title">
                  <h2>만족도 요약</h2>
                  <ThumbsUp size={16} />
                </div>

                <div className="satisfaction-summary-grid">
                  <div className="satisfaction-mini-card">
                    <span>일정 만족도 평균</span>
                    <strong>
                      {satisfactionSummary.scheduleAverage ?? '-'}
                      <small> / 5.0</small>
                    </strong>
                    {renderStars(satisfactionSummary.scheduleAverage)}
                  </div>

                  <div className="satisfaction-mini-card">
                    <span>회비 사용 만족도 평균</span>
                    <strong>
                      {satisfactionSummary.feeAverage ?? '-'}
                      <small> / 5.0</small>
                    </strong>
                    {renderStars(satisfactionSummary.feeAverage)}
                  </div>

                  <div className="satisfaction-mini-card response-card">
                    <span>응답률</span>

                    <div className="response-rate-row">
                      <strong>
                        {responseRate}
                        <small>%</small>
                      </strong>

                      <div
                        className="mini-response-ring"
                        style={{
                          background: `conic-gradient(
                            #2563eb 0%,
                            #2563eb ${responseRate}%,
                            #e5e7eb ${responseRate}%,
                            #e5e7eb 100%
                          )`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </article>

              <article className="health-panel monthly-trend-panel">
                <div className="health-panel-title">
                  <h2>월별 건강도 추이</h2>
                  <LineChart size={16} />
                </div>

                <div className="monthly-trend-empty">
                  <LineChart size={24} />
                  <strong>데이터 연동 완료 후 구현 예정입니다.</strong>
                  <p>
                    월별 건강도 점수 저장 기능이 추가되면 최근 3개월 추이를 표시
                  </p>
                </div>
              </article>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ClubHealthPage
