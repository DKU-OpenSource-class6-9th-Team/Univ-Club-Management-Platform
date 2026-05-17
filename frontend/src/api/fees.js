const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api' //백엔드 API 기본 경로

  //API 요청에 공통부분을 줄이기 위한 함수
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, { //브라우저에서 API요청
    credentials: 'include',
    headers: { //요청 데이터 형식을 알려주는 부분
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
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
export async function getFeeTransactions(clubId) {
  return request(`/clubs/${clubId}/fees/transactions/`)
}

//수입/지출 내역 등록하는 함수
export async function createFeeTransaction(clubId, formData) {
  const response = await fetch( //파일 업로드까지 염두하고 있으므로, 브라우저가 자동으로 header를 만들어야함.
    `${API_BASE_URL}/clubs/${clubId}/fees/transactions/`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData, //파일 업로드까지 포함할 수 있는 데이터 형식
    },
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw data || new Error('수입/지출 내역 등록에 실패했습니다.')
  }

  return data
}

