const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api' //백엔드 API 기본 경로


  // 브라우저 쿠키에서 특정 이름의 쿠키 값을 꺼내는 함수
// Django CSRF 토큰은 기본적으로 csrftoken이라는 이름의 쿠키에 저장됨
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
// POST 요청 전에 이 함수를 호출해서 csrftoken 쿠키가 브라우저에 생기게 함
async function ensureCsrfCookie() {
  await fetch(`${API_BASE_URL}/accounts/csrf/`, {
    method: 'GET',
    credentials: 'include',
  })
}


  //API 요청에 공통부분을 줄이기 위한 함수
async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await ensureCsrfCookie()

    const csrfToken = getCookie('csrftoken')

    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { //브라우저에서 API요청
    ...options,
    credentials: 'include',
    headers,
  })

  const data = await response.json().catch(() => null) //응답 json파일 -> 자바스크립트 객체 변환

  if (!response.ok) {
    throw data || new Error('API 요청에 실패했습니다.')
  }

  return data
}

//회비 요약 카드 데이터 가져오는 함수
export async function getFeeSummary(clubId) {
  return request(`/clubs/${clubId}/fees/summary/`)
}

//회원별 회비 납부 현황 가져오는 함수
export async function getFeePayments(clubId, params = {}) {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set('page', params.page) //페이지 번호
  if (params.pageSize) searchParams.set('page_size', params.pageSize) //페이지 당 몇명을 보여주는지
  if (params.status && params.status !== '전체') {
    searchParams.set('status', params.status)
  }
  if (params.search) searchParams.set('search', params.search) //이름 검색어

  const queryString = searchParams.toString() //쿼리를 문자열로 변환(요청 문자열로 변환)

  return request(
    `/clubs/${clubId}/fees/payments/${queryString ? `?${queryString}` : ''}`,
  )
}

//회원 납부 상태 변경 함수
export async function updateFeePaymentStatus(clubId, paymentId, status) {
  return request(`/clubs/${clubId}/fees/payments/${paymentId}/`, {
    method: 'PATCH', //일부 필드 수정 시 patch사용
    body: JSON.stringify({ status }),
  })
}

//최근 수입/지출 내역 가져오는 함수
export async function getFeeTransactions(clubId, params ={} ) {
  const searchParams = new URLSearchParams()

  if(params.limit) {
    searchParams.set('limit', params.limit)
  }

  const queryString = searchParams.toString()

  return request(`/clubs/${clubId}/fees/transactions/${queryString ? `?${queryString}` : ''}`,)
}

// 수입/지출 내역 등록하는 함수
export async function createFeeTransaction(clubId, formData) {
  // POST 요청 전에 CSRF 쿠키를 먼저 발급받음
  await ensureCsrfCookie()

  // 브라우저 쿠키에서 csrftoken 값을 꺼냄
  const csrfToken = getCookie('csrftoken')

  const response = await fetch(
    `${API_BASE_URL}/clubs/${clubId}/fees/transactions/`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData,
    },
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.detail ||
        '수입/지출 내역 등록에 실패했습니다.',
    )
  }

  return data
}