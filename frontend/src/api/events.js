const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// 브라우저 쿠키에서 특정 이름의 쿠키 값을 꺼내는 함수
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

// Django에서 CSRF 쿠키를 발급받기 위한 요청
async function ensureCsrfCookie() {
  const response = await fetch(`${API_BASE_URL}/accounts/csrf/`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('CSRF 토큰을 가져오지 못했습니다.')
  }
}

// POST / PATCH / DELETE 요청에 사용할 CSRF 헤더 생성
async function getCsrfHeaders() {
  await ensureCsrfCookie()

  const csrfToken = getCookie('csrftoken')

  return csrfToken
    ? { 'X-CSRFToken': csrfToken }
    : {}
}

// API 에러 메시지를 화면에서 쓰기 좋게 변환하는 함수
function normalizeApiError(data, fallbackMessage) {
  if (!data) {
    return new Error(fallbackMessage)
  }

  if (typeof data === 'string') {
    return new Error(data)
  }

  if (data.message) {
    return new Error(data.message)
  }

  if (data.detail) {
    return new Error(data.detail)
  }

  return data
}

// 공통 API 요청 함수
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

// 일정 목록 조회
export async function fetchEvents(clubId, filters = {}) {
  if (!clubId) {
    throw new Error('동아리 ID가 없습니다.')
  }

  const queryParams = new URLSearchParams()

  if (filters.eventType) {
    queryParams.set('event_type', filters.eventType)
  }

  if (filters.status) {
    queryParams.set('status', filters.status)
  }

  if (filters.search) {
    queryParams.set('search', filters.search)
  }

  const queryString = queryParams.toString()

  return request(
    `/clubs/${clubId}/events/${queryString ? `?${queryString}` : ''}`,
  )
}

// 일정 상세 조회
export async function fetchEventDetail(clubId, eventId) {
  if (!clubId || !eventId) {
    throw new Error('일정 정보가 없습니다.')
  }

  return request(`/clubs/${clubId}/events/${eventId}/`)
}

// 현재 사용자의 일정 관리 권한 조회
export async function fetchMyEventRole(clubId) {
  if (!clubId) {
    throw new Error('동아리 ID가 없습니다.')
  }

  return request(`/clubs/${clubId}/events/my-role/`)
}

// 일정 등록
export async function createEvent(clubId, eventData) {
  if (!clubId) {
    throw new Error('동아리 ID가 없습니다.')
  }

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/`, {
    method: 'POST',
    headers: {
      ...csrfHeaders,
    },
    body: JSON.stringify(eventData),
  })
}

// 일정 수정
export async function updateEvent(clubId, eventId, eventData) {
  if (!clubId || !eventId) {
    throw new Error('일정 정보가 없습니다.')
  }

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/${eventId}/`, {
    method: 'PATCH',
    headers: {
      ...csrfHeaders,
    },
    body: JSON.stringify(eventData),
  })
}

// 일정 삭제
export async function deleteEvent(clubId, eventId) {
  if (!clubId || !eventId) {
    throw new Error('일정 정보가 없습니다.')
  }

  const csrfHeaders = await getCsrfHeaders()

  return request(`/clubs/${clubId}/events/${eventId}/`, {
    method: 'DELETE',
    headers: {
      ...csrfHeaders,
    },
  })
}