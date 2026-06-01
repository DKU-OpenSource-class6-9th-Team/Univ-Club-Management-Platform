/*
  만족도 조사 관련 API 함수 모음

  현재 백엔드 주소 구조:
  GET  /api/clubs/:clubId/surveys/monthly/
  POST /api/clubs/:clubId/surveys/items/
  POST /api/clubs/:clubId/surveys/draft/
  POST /api/clubs/:clubId/surveys/submit/
*/

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/clubs'

/*
  Django CSRF 토큰을 쿠키에서 꺼내는 함수
  POST 요청을 보낼 때 필요함.
*/
function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split('; ') : []

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split('=')

    if (key === name) {
      return decodeURIComponent(valueParts.join('='))
    }
  }

  return null
}

/*
  Django 서버에서 CSRF 쿠키를 먼저 받아온 뒤,
  요청 헤더에 넣을 X-CSRFToken 값을 만들어주는 함수
*/
async function getCsrfHeaders() {
  await fetch('http://localhost:8000/api/accounts/csrf/', {
    credentials: 'include',
  })

  const csrfToken = getCookie('csrftoken')

  return csrfToken ? { 'X-CSRFToken': csrfToken } : {}
}

/*
  응답 처리 공통 함수
*/
async function handleResponse(response) {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw data || new Error('API 요청에 실패했습니다.')
  }

  return data
}

/*
  현재 만족도 조사 항목 조회

  백엔드:
  GET /api/clubs/:clubId/surveys/monthly/
*/
export async function getMonthlySurvey(clubId) {
  const response = await fetch(`${API_BASE_URL}/${clubId}/surveys/monthly/`, {
    credentials: 'include',
  })

  return handleResponse(response)
}

/*
  운영진이 선택한 조사 항목 저장

  백엔드:
  POST /api/clubs/:clubId/surveys/items/
*/
export async function saveSurveyItems(clubId, surveyItems) {
  const csrfHeaders = await getCsrfHeaders()

  const response = await fetch(`${API_BASE_URL}/${clubId}/surveys/items/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body: JSON.stringify(surveyItems),
  })

  return handleResponse(response)
}

/*
  만족도 조사 임시 저장

  백엔드:
  POST /api/clubs/:clubId/surveys/draft/
*/
export async function saveMonthlySurveyDraft(clubId, surveyData) {
  const csrfHeaders = await getCsrfHeaders()

  const response = await fetch(`${API_BASE_URL}/${clubId}/surveys/draft/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body: JSON.stringify(surveyData),
  })

  return handleResponse(response)
}

/*
  만족도 조사 최종 제출

  백엔드:
  POST /api/clubs/:clubId/surveys/submit/
*/
export async function submitMonthlySurvey(clubId, surveyData) {
  const csrfHeaders = await getCsrfHeaders()

  const response = await fetch(`${API_BASE_URL}/${clubId}/surveys/submit/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body: JSON.stringify(surveyData),
  })

  return handleResponse(response)
}

/* 만족도 조사 결과 조회 API */
export async function getSurveyResults(clubId) {
  const response = await fetch(`${API_BASE_URL}/${clubId}/surveys/results/`, {
    credentials: 'include',
  });

  return handleResponse(response);
}