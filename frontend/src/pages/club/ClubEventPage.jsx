import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  CreditCard,
  Edit3,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'

import { getClub } from '../../api/clubs.js'
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  fetchMyEventRole,
  updateEvent,
} from '../../api/events.js'

import '../../styles/club/clubDashboard.css'
import '../../styles/club/clubEvents.css'

const EVENT_TYPE_OPTIONS = [
  { value: 'regular', label: '정기 모임' },
  { value: 'activity', label: '행사' },
  { value: 'recruitment', label: '모집 일정' },
  { value: 'interview', label: '면접 일정' },
  { value: 'project', label: '프로젝트 일정' },
  { value: 'etc', label: '기타' },
]

const STATUS_OPTIONS = [
  { value: 'scheduled', label: '예정' },
  { value: 'completed', label: '완료' },
  { value: 'canceled', label: '취소' },
]

const EMPTY_EVENT_FORM = {
  title: '',
  event_type: 'regular',
  description: '',
  location: '',
  start_at: '',
  end_at: '',
  allow_application: true,
  max_participants: '',
  application_start_at: '',
  application_end_at: '',
  status: 'scheduled',
  cancel_reason: '',
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDatetimeLocalValue(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000
  const localDate = new Date(date.getTime() - timezoneOffset)

  return localDate.toISOString().slice(0, 16)
}

function buildEventPayload(formData) {
  return {
    title: formData.title.trim(),
    event_type: formData.event_type,
    description: formData.description.trim(),
    location: formData.location.trim(),
    start_at: formData.start_at,
    end_at: formData.end_at || null,
    allow_application: formData.allow_application,
    max_participants: formData.max_participants
      ? Number(formData.max_participants)
      : null,
    application_start_at: formData.application_start_at || null,
    application_end_at: formData.application_end_at || null,
    status: formData.status,
    cancel_reason:
      formData.status === 'canceled'
        ? formData.cancel_reason.trim()
        : '',
  }
}

function getApiErrorMessage(error) {
  if (!error) {
    return '요청 처리 중 오류가 발생했습니다.'
  }

  if (error.message) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error === 'object') {
    const firstKey = Object.keys(error)[0]

    if (firstKey) {
      const value = error[firstKey]

      if (Array.isArray(value)) {
        return `${firstKey}: ${value.join(', ')}`
      }

      return `${firstKey}: ${String(value)}`
    }
  }

  return '요청 처리 중 오류가 발생했습니다.'
}

function ClubEventPage() {
  const navigate = useNavigate()
  const { clubId } = useParams()

  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {}
  

  const [club, setClub] = useState(null)
  const [isClubLoading, setIsClubLoading] = useState(true)

  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [eventRole, setEventRole] = useState(null)
  const [canManageEvents, setCanManageEvents] = useState(false)

  const [filters, setFilters] = useState({
    eventType: '',
    status: '',
    search: '',
  })

  const [formData, setFormData] = useState(EMPTY_EVENT_FORM)
  const [editingEventId, setEditingEventId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const currentPageName = '일정·출석 관리'

  const eventSummary = useMemo(() => {
    const totalCount = events.length
    const scheduledCount = events.filter(
      (event) => event.status === 'scheduled',
    ).length
    const completedCount = events.filter(
      (event) => event.status === 'completed',
    ).length
    const canceledCount = events.filter(
      (event) => event.status === 'canceled',
    ).length

    return {
      totalCount,
      scheduledCount,
      completedCount,
      canceledCount,
    }
  }, [events])

  const handleLogout = () => {
    localStorage.removeItem('loginUser')
    navigate('/login')
  }

  const loadClubInfo = async () => {
    if (!clubId) return

    try {
      setIsClubLoading(true)
      const data = await getClub(clubId)
      setClub(data)
    } catch (error) {
      console.error('동아리 정보를 불러오지 못했습니다.', error)
    } finally {
      setIsClubLoading(false)
    }
  }

  const loadEventRole = async () => {
    if (!clubId) return

    try {
      const data = await fetchMyEventRole(clubId)
      setEventRole(data)
      setCanManageEvents(Boolean(data.can_manage_events))
    } catch (error) {
      console.error('일정 관리 권한을 확인하지 못했습니다.', error)
      setEventRole(null)
      setCanManageEvents(false)
    }
  }

  const loadEvents = async () => {
    if (!clubId) return

    try {
      setIsLoading(true)
      const data = await fetchEvents(clubId, filters)
      setEvents(data.results || [])
    } catch (error) {
      console.error('일정 목록 조회 실패:', error)
      alert('일정 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadClubInfo()
    loadEventRole()
  }, [clubId])

  useEffect(() => {
    loadEvents()
  }, [clubId, filters.eventType, filters.status])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    loadEvents()
  }

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const resetForm = () => {
    setFormData(EMPTY_EVENT_FORM)
    setEditingEventId(null)
    setIsFormOpen(false)
  }

  const handleOpenCreateForm = () => {
    setFormData(EMPTY_EVENT_FORM)
    setEditingEventId(null)
    setIsFormOpen(true)
  }

  const handleEditEvent = (event) => {
    setEditingEventId(event.id)
    setFormData({
      title: event.title || '',
      event_type: event.event_type || 'regular',
      description: event.description || '',
      location: event.location || '',
      start_at: toDatetimeLocalValue(event.start_at),
      end_at: toDatetimeLocalValue(event.end_at),
      allow_application: Boolean(event.allow_application),
      max_participants: event.max_participants || '',
      application_start_at: toDatetimeLocalValue(event.application_start_at),
      application_end_at: toDatetimeLocalValue(event.application_end_at),
      status: event.status || 'scheduled',
      cancel_reason: event.cancel_reason || '',
    })
    setIsFormOpen(true)
  }

  const handleSubmitEvent = async (event) => {
    event.preventDefault()

    if (!formData.title.trim()) {
      alert('일정명을 입력해주세요.')
      return
    }

    if (!formData.start_at) {
      alert('시작 일시를 입력해주세요.')
      return
    }

    if (formData.status === 'canceled' && !formData.cancel_reason.trim()) {
      alert('취소 상태로 변경하려면 취소 사유를 입력해야 합니다.')
      return
    }

    try {
      setIsSubmitting(true)

      const payload = buildEventPayload(formData)

      if (editingEventId) {
        await updateEvent(clubId, editingEventId, payload)
        alert('일정이 수정되었습니다.')
      } else {
        await createEvent(clubId, payload)
        alert('일정이 등록되었습니다.')
      }

      resetForm()
      await loadEvents()
    } catch (error) {
      console.error('일정 저장 실패:', error)
      alert(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEvent = async (eventId) => {
    const confirmed = window.confirm(
      '이 일정을 삭제하시겠습니까? 삭제된 일정은 복구하기 어렵습니다.',
    )

    if (!confirmed) return

    try {
      await deleteEvent(clubId, eventId)
      alert('일정이 삭제되었습니다.')
      await loadEvents()
    } catch (error) {
      console.error('일정 삭제 실패:', error)
      alert(getApiErrorMessage(error))
    }
  }

  const handleCancelEvent = async (eventItem) => {
    const cancelReason = window.prompt('일정 취소 사유를 입력해주세요.')

    if (cancelReason === null) return

    if (!cancelReason.trim()) {
      alert('취소 사유는 반드시 입력해야 합니다.')
      return
    }

    try {
      await updateEvent(clubId, eventItem.id, {
        status: 'canceled',
        cancel_reason: cancelReason.trim(),
      })
      alert('일정이 취소 처리되었습니다.')
      await loadEvents()
    } catch (error) {
      console.error('일정 취소 실패:', error)
      alert(getApiErrorMessage(error))
    }
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

              {canManageEvents && (
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

            <Link to={`/club/${clubId}/events`} className="sidebar-link active">
              <CalendarDays size={19} />
              일정·출석 관리
            </Link>

            <Link to="/club/settings" className="sidebar-link">
              <Settings size={19} />
              건강도 분석
            </Link>
          </nav>

          <button type="button" className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            로그아웃
          </button>
        </aside>

        <main className="club-events-main">
          <nav className="dashboard-breadcrumb">
            <Link to="/main">플랫폼 메인</Link>
            <span>›</span>
            <Link to="/main">내 동아리</Link>
            <span>›</span>
            <span>{isClubLoading ? '불러오는 중...' : club?.name || '동아리'}</span>
            <span>›</span>
            <span className="breadcrumb-current">{currentPageName}</span>
          </nav>

          <header className="dashboard-header club-events-header">
            <div>
              <p className="dashboard-label">Club Events</p>
              <h1 className="club-events-title">{currentPageName}</h1>
              <p className="dashboard-desc">
                정기 모임, 행사, 모집 일정 등을 등록하고 운영 상태를 관리합니다.
              </p>
            </div>

            <div className="dashboard-header-actions">
              <button type="button" className="icon-button">
                <Bell size={18} />
              </button>

              <div className="user-chip">
                <span className="user-avatar">
                  {loginUser.nickname?.[0] || loginUser.username?.[0] || 'U'}
                </span>
                <div>
                  <strong>{loginUser.nickname || loginUser.username || '사용자'}</strong>
                  <small>
                    {eventRole?.role_display || '일반 회원'}
                  </small>
                </div>
              </div>
            </div>
          </header>

          <section className="event-summary-grid">
            <article className="event-summary-card">
              <span>전체 일정</span>
              <strong>{eventSummary.totalCount}</strong>
              <p>등록된 전체 일정 수</p>
            </article>

            <article className="event-summary-card">
              <span>예정 일정</span>
              <strong>{eventSummary.scheduledCount}</strong>
              <p>앞으로 진행할 일정</p>
            </article>

            <article className="event-summary-card">
              <span>완료 일정</span>
              <strong>{eventSummary.completedCount}</strong>
              <p>운영 완료된 일정</p>
            </article>

            <article className="event-summary-card">
              <span>취소 일정</span>
              <strong>{eventSummary.canceledCount}</strong>
              <p>취소 사유 기록 필요</p>
            </article>
          </section>

          <section className="event-toolbar">
            <form className="event-filter-form" onSubmit={handleSearchSubmit}>
              <select
                value={filters.eventType}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    eventType: event.target.value,
                  }))
                }
              >
                <option value="">전체 유형</option>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }))
                }
              >
                <option value="">전체 상태</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="event-search-box">
                <Search size={16} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                  placeholder="일정명 검색"
                />
              </div>

              <button type="submit" className="event-secondary-button">
                검색
              </button>
            </form>

            {canManageEvents && (
              <button
                type="button"
                className="event-primary-button"
                onClick={handleOpenCreateForm}
              >
                <Plus size={17} />
                일정 등록
              </button>
            )}
          </section>

          {canManageEvents && isFormOpen && (
            <section className="event-form-card">
              <div className="event-section-title-row">
                <div>
                  <p className="event-section-label">Event Form</p>
                  <h2>{editingEventId ? '일정 수정' : '일정 등록'}</h2>
                </div>

                <button
                  type="button"
                  className="event-text-button"
                  onClick={resetForm}
                >
                  닫기
                </button>
              </div>

              <form className="event-form" onSubmit={handleSubmitEvent}>
                <div className="event-form-grid">
                  <label>
                    <span>일정명</span>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      placeholder="예: 5월 정기 모임"
                    />
                  </label>

                  <label>
                    <span>일정 유형</span>
                    <select
                      name="event_type"
                      value={formData.event_type}
                      onChange={handleFormChange}
                    >
                      {EVENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>시작 일시</span>
                    <input
                      type="datetime-local"
                      name="start_at"
                      value={formData.start_at}
                      onChange={handleFormChange}
                    />
                  </label>

                  <label>
                    <span>종료 일시</span>
                    <input
                      type="datetime-local"
                      name="end_at"
                      value={formData.end_at}
                      onChange={handleFormChange}
                    />
                  </label>

                  <label>
                    <span>장소</span>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleFormChange}
                      placeholder="예: 학생회관 302호"
                    />
                  </label>

                  <label>
                    <span>최대 참여 인원</span>
                    <input
                      type="number"
                      min="1"
                      name="max_participants"
                      value={formData.max_participants}
                      onChange={handleFormChange}
                      placeholder="제한 없으면 비워두기"
                    />
                  </label>

                  <label>
                    <span>신청 시작 일시</span>
                    <input
                      type="datetime-local"
                      name="application_start_at"
                      value={formData.application_start_at}
                      onChange={handleFormChange}
                    />
                  </label>

                  <label>
                    <span>신청 마감 일시</span>
                    <input
                      type="datetime-local"
                      name="application_end_at"
                      value={formData.application_end_at}
                      onChange={handleFormChange}
                    />
                  </label>

                  <label>
                    <span>일정 상태</span>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="event-checkbox-label">
                    <input
                      type="checkbox"
                      name="allow_application"
                      checked={formData.allow_application}
                      onChange={handleFormChange}
                    />
                    <span>참여 신청 허용</span>
                  </label>
                </div>

                <label className="event-full-field">
                  <span>일정 설명</span>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="일정 내용이나 준비물을 입력하세요."
                  />
                </label>

                {formData.status === 'canceled' && (
                  <label className="event-full-field">
                    <span>취소 사유</span>
                    <textarea
                      name="cancel_reason"
                      value={formData.cancel_reason}
                      onChange={handleFormChange}
                      placeholder="취소 사유를 입력하세요."
                    />
                  </label>
                )}

                <div className="event-form-actions">
                  <button
                    type="button"
                    className="event-secondary-button"
                    onClick={resetForm}
                  >
                    취소
                  </button>

                  <button
                    type="submit"
                    className="event-primary-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? '저장 중...'
                      : editingEventId
                        ? '수정 저장'
                        : '일정 등록'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="event-list-card">
            <div className="event-section-title-row">
              <div>
                <p className="event-section-label">Event List</p>
                <h2>일정 목록</h2>
              </div>

              <span className="event-count-text">
                총 {events.length}개
              </span>
            </div>

            {isLoading ? (
              <div className="event-empty-box">일정 목록을 불러오는 중입니다.</div>
            ) : events.length === 0 ? (
              <div className="event-empty-box">
                등록된 일정이 없습니다. 운영진이라면 일정 등록 버튼으로 새 일정을 만들어보세요.
              </div>
            ) : (
              <div className="event-card-list">
                {events.map((event) => (
                  <article key={event.id} className="event-item-card">
                    <div className="event-item-main">
                      <div className="event-badge-row">
                        <span className="event-type-badge">
                          {event.event_type_display || event.event_type}
                        </span>
                        <span className={`event-status-badge ${event.status}`}>
                          {event.status_display || event.status}
                        </span>
                      </div>

                      <h3>{event.title}</h3>

                      <div className="event-meta-grid">
                        <p>
                          <strong>시작</strong>
                          {formatDateTime(event.start_at)}
                        </p>
                        <p>
                          <strong>종료</strong>
                          {formatDateTime(event.end_at)}
                        </p>
                        <p>
                          <strong>장소</strong>
                          {event.location || '-'}
                        </p>
                        <p>
                          <strong>정원</strong>
                          {event.max_participants
                            ? `${event.max_participants}명`
                            : '제한 없음'}
                        </p>
                      </div>

                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}

                      {event.status === 'canceled' && event.cancel_reason && (
                        <div className="event-cancel-reason">
                          <strong>취소 사유</strong>
                          <p>{event.cancel_reason}</p>
                        </div>
                      )}
                    </div>

                    {canManageEvents && (
                      <div className="event-item-actions">
                        <button
                          type="button"
                          className="event-secondary-button"
                          onClick={() => handleEditEvent(event)}
                        >
                          <Edit3 size={15} />
                          수정
                        </button>

                        {event.status !== 'canceled' && (
                          <button
                            type="button"
                            className="event-warning-button"
                            onClick={() => handleCancelEvent(event)}
                          >
                            <XCircle size={15} />
                            취소 처리
                          </button>
                        )}

                        <button
                          type="button"
                          className="event-danger-button"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 size={15} />
                          삭제
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

export default ClubEventPage