/*
  만족도 조사 관련 API 함수 모음

  현재 주소 구조:
  GET  /api/clubs/:clubId/survey/
  POST /api/clubs/:clubId/survey/items/
  POST /api/clubs/:clubId/survey/draft/
  POST /api/clubs/:clubId/survey/submit/
*/

const API_BASE_URL = 'http://localhost:8000/api/clubs';

/*
  Django CSRF 토큰을 쿠키에서 꺼내는 함수
  POST, PATCH, DELETE 요청을 보낼 때 필요함.
*/
function getCookie(name) {
  const cookies = document.cookie.split('; ');

  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/*
  Django 서버에서 CSRF 쿠키를 먼저 받아온 뒤,
  요청 헤더에 넣을 X-CSRFToken 값을 만들어주는 함수
*/
async function getCsrfHeaders() {
  await fetch('http://localhost:8000/api/accounts/csrf/', {
    credentials: 'include',
  });

  const csrfToken = getCookie('csrftoken');

  return csrfToken ? { 'X-CSRFToken': csrfToken } : {};
}

/*
  현재 2주차 만족도 조사 항목 조회

  응답 예시:
  {
    year: 2026,
    month: 5,
    round_number: 2,
    period_start_date: "2026-05-15",
    period_end_date: "2026-05-31",
    schedule_items: [...],
    fee_items: [...],
    answers: {},
    status: null
  }
*/
export async function getMonthlySurvey(clubId) {
  const response = await fetch(`${API_BASE_URL}/${clubId}/survey/`, {
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

/*
  운영진이 선택한 조사 항목 저장

  운영진이 조사 항목 관리 모달에서
  일정 내역 또는 회비 사용 내역을 선택한 뒤
  "선택 항목 반영하기"를 눌렀을 때 사용함.
*/
export async function saveSurveyItems(clubId, surveyItems) {
  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(`${API_BASE_URL}/${clubId}/survey/items/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body: JSON.stringify(surveyItems),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

/*
  만족도 조사 임시 저장

  사용자가 선택한 별점 답변을 중간 저장할 때 사용함.
*/
export async function saveMonthlySurveyDraft(clubId, surveyData) {
  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(`${API_BASE_URL}/${clubId}/survey/draft/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body: JSON.stringify(surveyData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

/*
  만족도 조사 최종 제출

  사용자가 모든 항목을 평가한 뒤 제출 버튼을 눌렀을 때 사용함.
*/
export async function submitMonthlySurvey(clubId, surveyData) {
  const csrfHeaders = await getCsrfHeaders();

  const response = await fetch(`${API_BASE_URL}/${clubId}/survey/submit/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body: JSON.stringify(surveyData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}