const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split('; ') : []

  for (const cookie of cookies) {
    const [cookieName, ...cookieValueParts] = cookie.split('=')

    if (cookieName === name) {
      return decodeURIComponent(cookieValueParts.join('='))
    }
  }

  return null
}

async function ensureCsrfCookie() {
  const response = await fetch(`${API_BASE_URL}/accounts/csrf/`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('CSRF 토큰을 가져오지 못했습니다.')
  }
}

async function getCsrfHeaders() {
  await ensureCsrfCookie()

  const csrfToken = getCookie('csrftoken')

  return csrfToken ? { 'X-CSRFToken': csrfToken } : {}
}

function normalizeApiError(data, fallbackMessage) {
  if (!data) return new Error(fallbackMessage)
  if (typeof data === 'string') return new Error(data)
  if (data.message) return new Error(data.message)
  if (data.detail) return new Error(data.detail)

  return data
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw normalizeApiError(data, 'API 요청에 실패했습니다.')
  }

  return data
}

export async function fetchEvents(clubId, filters = {}) {
  if (!clubId) throw new Error('동아리 ID가 없습니다.')

  const queryParams = new URLSearchParams()

  if (filters.eventType) queryParams.set('event_type', filters.eventType)
  if (filters.status) queryParams.set('status', filters.status)
  if (filters.search) queryParams.set('search', filters.search)

  const queryString = queryParams.toString()

  return request(
    `/clubs/${clubId}/events/${queryString ? `?${queryString}` : ''}`,
  )
}

export async function fetchEventDetail(clubId, eventId) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  return request(`/clubs/${clubId}/events/${eventId}/`)
}

export async function fetchMyEventRole(clubId) {
  if (!clubId) throw new Error('동아리 ID가 없습니다.')

  return request(`/clubs/${clubId}/events/my-role/`)
}

export async function createEvent(clubId, eventData) {
  if (!clubId) throw new Error('동아리 ID가 없습니다.')

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/`, {
    method: 'POST',
    headers: {
      ...csrfHeaders,
    },
    body: JSON.stringify(eventData),
  })
}

export async function updateEvent(clubId, eventId, eventData) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/${eventId}/`, {
    method: 'PATCH',
    headers: {
      ...csrfHeaders,
    },
    body: JSON.stringify(eventData),
  })
}

export async function deleteEvent(clubId, eventId) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/${eventId}/`, {
    method: 'DELETE',
    headers: {
      ...csrfHeaders,
    },
  })
}

export async function applyEvent(clubId, eventId) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/${eventId}/apply/`, {
    method: 'POST',
    headers: {
      ...csrfHeaders,
    },
  })
}

export async function cancelEventApplication(clubId, eventId, cancelReason = '') {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/${eventId}/cancel-application/`, {
    method: 'POST',
    headers: {
      ...csrfHeaders,
    },
    body: JSON.stringify({
      cancel_reason: cancelReason,
    }),
  })
}

export async function fetchMyEventApplication(clubId, eventId) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  return request(`/clubs/${clubId}/events/${eventId}/my-application/`)
}

export async function fetchEventApplications(clubId, eventId) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  return request(`/clubs/${clubId}/events/${eventId}/applications/`)
}

export async function fetchEventAttendances(clubId, eventId) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  return request(`/clubs/${clubId}/events/${eventId}/attendances/`)
}

export async function checkEventAttendance(clubId, eventId, attendanceData) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/${eventId}/attendances/check/`, {
    method: 'POST',
    headers: {
      ...csrfHeaders,
    },
    body: JSON.stringify({
      user_id: attendanceData.userId,
      status: attendanceData.status,
      memo: attendanceData.memo || '',
    }),
  })
}

export async function fetchEventStats(clubId, eventId) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  return request(`/clubs/${clubId}/events/${eventId}/stats/`)
}

export async function fetchEventNoShows(clubId, eventId) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  return request(`/clubs/${clubId}/events/${eventId}/no-shows/`)
}

export async function fetchEventReport(clubId, eventId) {
  if (!clubId || !eventId) throw new Error('일정 정보가 없습니다.')

  return request(`/clubs/${clubId}/events/${eventId}/report/`)
}

export async function fetchMemberActivitySummary(clubId) {
  if (!clubId) throw new Error('동아리 ID가 없습니다.')

  return request(`/clubs/${clubId}/events/member-activity/`)
}

export async function fetchMemberActivityDetail(clubId, userId) {
  if (!clubId || !userId) throw new Error('회원 정보가 없습니다.')

  return request(`/clubs/${clubId}/events/member-activity/${userId}/`)
}

export async function fetchLowParticipationMembers(clubId) {
  if (!clubId) throw new Error('동아리 ID가 없습니다.')

  return request(`/clubs/${clubId}/events/low-participation/`)
}


export async function fetchEventOperationStats(clubId, year) {
  if (!clubId) throw new Error('동아리 ID가 없습니다.')

  const queryParams = new URLSearchParams()

  if (year) queryParams.set('year', year)

  const queryString = queryParams.toString()

  return request(
    `/clubs/${clubId}/events/operation-stats/${
      queryString ? `?${queryString}` : ''
    }`,
  )
}

export async function createRecurringEvents(clubId, recurringData) {
  if (!clubId) throw new Error('동아리 ID가 없습니다.')

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/recurring/`, {
    method: 'POST',
    headers: {
      ...csrfHeaders,
    },
    body: JSON.stringify(recurringData),
  })
}

export async function fetchEventTimeline(clubId, year) {
  if (!clubId) throw new Error('동아리 ID가 없습니다.')

  const queryParams = new URLSearchParams()

  if (year) queryParams.set('year', year)

  const queryString = queryParams.toString()

  return request(
    `/clubs/${clubId}/events/timeline/${
      queryString ? `?${queryString}` : ''
    }`,
  )
}