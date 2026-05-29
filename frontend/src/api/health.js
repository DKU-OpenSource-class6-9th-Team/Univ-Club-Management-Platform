const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

//동아리 건강도 분석 데이터 조회 함수
// 역할:
//- 백엔드에서 계산한 건강도 분석 데이터를 가져온다.
//- 건강도 분석 페이지에서 상단 카드, 영역별 점수, 영향 지표,.
export async function getClubHealthAnalysis(clubId) {
  const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/health/`, {
    method: 'GET',
    credentials: 'include',
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw data || new Error('건강도 분석 데이터를 불러오지 못했습니다.')
  }

  return data
}