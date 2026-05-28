/*회비 관리페이지 전체 틀 담당
- 필요한 라이브러리 및 컴포넌트 import
- 페이지 상태값 관리
- 필터, 검색, 페이지네이션
- 미구현 기능 안내 처리
(여러 컴포넌트를 불러와 조립)*/

import { useEffect, useMemo, useState } from 'react' //바뀌는 값, 계산결과 저장, 값 변경 시 자동 실행
import { Link, useNavigate, useParams } from 'react-router-dom'
import { //icon 삽입
  Bell,
  CalendarDays,
  CreditCard,
  Edit3,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircleHeart,
  Settings,
  Users,
} from 'lucide-react'

//각 fee디렉터리의 컴포넌트 추가
import FeeActionButtons from './fee/components/FeeActionButtons.jsx' // 영수증 일관 다운로드. 엑셀 다운로드 버튼(이후 추가적인 기능 구현 가능 시)
import FeeSummaryCards from './fee/components/FeeSummary.jsx'// 상단에 회비 잔액, 이번달 수입/지출, 미납회원, 납부율을 나타내는 카드
import FeeRegisterForm from './fee/components/FeeRegisterForm.jsx'// 수입/ 지출 내역 등록 폼 영역
import RecentTransactionTable from './fee/components/RecentTransactionTable.jsx' // 최근 수입/지출 내역 알려주는 테이블 영역
import MemberPaymentTable from './fee/components/MemberPaymentTable.jsx'// 회원별 납부 현황 테이블 영역
import FeeSideCards from './fee/components/FeeSideCards.jsx' // 오른쪽 하단 이의제기(나중에 좀 바꿀 듯), 만족도율, 회비사용증빙 카드 영역
import { formatWon } from './fee/utils/feeFormat.js' // 입력받은 숫자 100단위 ","삽입 및 "원" 형태 추가하는 함수

//왼쪽 사이드바, 로고, 사용자 프로필, 로그아웃 버튼 같은 기본 관리자 레이아웃을 재사용
import '../../styles/club/clubDashboard.css'
import '../../styles/club/clubFee.css'
import { getClub } from '../../api/clubs.js'

//fees.js에 만들어져있는 api 함수를 가져오는 코드
import {
  createFeeTransaction,
  getFeeSummary,
  getFeeTransactions,
  getFeePayments,
  updateFeePaymentStatus,
} from '../../api/fees.js'



//컴포넌트 시작
//회비 관리 페이지 담당하는 React 컴포넌트
function ClubFeePage() {
  const navigate = useNavigate() //로그아웃 후 로그인페이지 이동에 사용
  const { clubId } = useParams() //동아리의 ID를 가져오기위해 사용

  const effectiveClubId = clubId

  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {}
  const isClubManager = loginUser.role === 'CLUB_MANAGER'

  const currentPageName = '회비 관리'

  const [club, setClub] = useState(null)
  const [isClubLoading, setIsClubLoading] = useState(true)



  const [members, setMembers] = useState([]) //회원별 납부현황 데이터 저장
  const [transactions, setTransactions] = useState([]) //최근 수입/지출 내역 저장
  const [summary, setSummary] = useState(null) //상단 카드영역 내용 저장
  const [sideStats, setSideStats] = useState(null) //우하단 요약 카드 내용 저장

  const [allTransactions, setAllTransactions] = useState([])
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isTransactionModalLoading, setIsTransactionModalLoading] = useState(false)

  const [isLoading, setIsLoading] = useState(false) //회비 데이터를 불러오는 중인지 상태
  const [isSubmitting, setIsSubmitting] = useState(false) //등록 요청 진행중인지 상태


  const [memberFilter, setMemberFilter] = useState('전체') //납부 현황 필터
  const [memberSearch, setMemberSearch] = useState('') //회원 검색창 입력값
  const [currentPage, setCurrentPage] = useState(1) //회원별 납부 현황의 페이지 번호
  const [pageSize, setPageSize] = useState(10) //한 페이지에 보여주는 인원 수
  const [transactionType, setTransactionType] = useState('수입') //수입/지출 등록 중 선택한 값

  const filteredMembers = useMemo(() => { //프론트 회원 배열의 검색어, 필터 적용(데이터 연동 시 삭제 예정)
    const normalizedSearch = memberSearch.trim().toLowerCase()

    return members.filter((member) => {
      const isStatusMatched = memberFilter === '전체' || member.status === memberFilter

      if (!normalizedSearch) {
        return isStatusMatched
      }

      const searchTarget = `${member.name} ${member.department} ${member.studentId}`.toLowerCase()
      return isStatusMatched && searchTarget.includes(normalizedSearch)
    })
  }, [members, memberFilter, memberSearch])

  //프론트에서 회원 목록 10명씩 나눠 보여주는 로직 <백엔드 페이지네이션 시>
  const totalPageCount = Math.max(1, Math.ceil(filteredMembers.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPageCount) 
  const pageStartIndex = (safeCurrentPage - 1) * pageSize
  const pageEndIndex = Math.min(pageStartIndex + pageSize, filteredMembers.length)
  const pagedMembers = filteredMembers.slice(pageStartIndex, pageEndIndex)

  //상단 요약 카드의 값 저장 및 계산
  const totalMemberCount = members.length
  const paidMemberCount = members.filter((member) => member.status === '완료').length
  const unpaidMemberCount = members.filter((member) => member.status === '미납').length
  const paymentRate = totalMemberCount
    ? Math.round((paidMemberCount / totalMemberCount) * 100)
    : 0

  useEffect(() => { //필터 및 검색어의 표시되는 개수 변경 시 1페이지로 이동
    setCurrentPage(1)
  }, [memberFilter, memberSearch, pageSize])

  useEffect(() => {
    if (currentPage > totalPageCount) {
      setCurrentPage(totalPageCount)
    }
  }, [currentPage, totalPageCount])

  //페이지가 처음 렌더링 될 때 동아리 정보를 불러오는 역할 수행
  useEffect(() => {
  const loadClubInfo = async () => {
    if (!effectiveClubId) return

    try {
      const data = await getClub(effectiveClubId)
      setClub(data)
    } catch (error) {
      console.error('동아리 정보를 불러오지 못했습니다.', error)
    } finally {
      setIsClubLoading(false)
    }
  }

  loadClubInfo()
}, [effectiveClubId])


  const handleLogout = () => { //로그아웃 버튼 누르면 로그아웃, 로그인 페이지 이동
    localStorage.removeItem('loginUser')
    navigate('/login')
  }

  const showFeatureInProgress = (featureName) => { //미구현 기능일 시 안냐 메세지 출력
    alert(`${featureName} 기능은 현재 구현 중입니다. API 연동 후 제공될 예정입니다.`)
  }

  //백엔드에서 회비 데이터 불러오는 함수 (상단 요약 카드 API, 최근 수입/지출 내역 API)
  const loadFeeData = async () => {
    if(!effectiveClubId) return

    try{
      setIsLoading(true)

      //요약카드, 수입/지출내역 동시에 요청하는 코드
      const [summaryData, transactionData, paymentData] = await Promise.all([
        getFeeSummary(effectiveClubId),
        getFeeTransactions(effectiveClubId),
        getFeePayments(effectiveClubId, { 
          status: memberFilter,
          search: memberSearch,
          page: currentPage,
          pageSize,
        }),
      ])

      setSummary(summaryData) //불러온 값 summary 상태에 저장
      setTransactions(transactionData.results || []) //내역 배열을 transaction 상태에 저장
      setMembers(paymentData.results || [])
    } catch (error){
      console.error('회비 데이터 조회 실패:', error)
      alert('회비 데이터를 불러오지 못했습니다.')
    } finally{
      setIsLoading(false)
    }
  }

  


//페이지가 처음 렌더링 될 때 회비 데이터를 불러오는 역할 수행
useEffect(() => {
  loadFeeData()
}, [effectiveClubId])


//수입/지출 내역 등록하는 함수(FeeRegisterForm에서 호출됨)
const handleCreateTransaction = async (formData) => {
  if(!effectiveClubId){
    alert('동아리 ID가 없어 수입/지출 내역을 등록할 수 없습니다.')
    return false
  }

  try{
    setIsSubmitting(true)

    await createFeeTransaction(effectiveClubId, formData) //실제 백엔드 등록 API를 호출하는 코드
    alert('수입/지출 내역 등록 완료되었습니다.')
    await loadFeeData() //등록 후 데이터를 다시 불러옴(갱신)

    return true
  } catch (error){
    console.error('수입/지출 내역 등록 실패:',error)
    alert(error?.message || '수입/지출 내역 등록을 실패했습니다.')

    return false
  } finally {
    setIsSubmitting(false) //상태 종료
  }
}


const handleOpenTransactionModal = async () => {
  if (!effectiveClubId) {
    alert('내역을 불러올 수 없습니다.')
    return
  }

  try {
    setIsTransactionModalLoading(true)

    const data = await getFeeTransactions(effectiveClubId, { limit: 'all' })

    setAllTransactions(data.results || [])
    setIsTransactionModalOpen(true)
  } catch (error) {
    console.error('전체 수입/지출 내역 조회 실패:', error)
    alert('전체 수입/지출 내역을 불러오지 못했습니다.')
  } finally {
    setIsTransactionModalLoading(false)
  }
}


//납부 상태 변경 함수
const handleChangePaymentStatus = async (member) => {
  const nextStatus = member.status === '완료' ? '미납' : '완료'

  try { //백엔드 PATCH API 호출을 통해 db값 변경
    await updateFeePaymentStatus(effectiveClubId, member.id, nextStatus)

    await loadFeeData() //변경 후 다시 데이터 불러오기, 갱신
  } catch (error) {
    console.error('납부 상태 변경 실패:', error)
    alert(error?.message || '납부 상태 변경에 실패했습니다.')
  }
}


  //전체 화면 구조//
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

          <Link to={`/club/${clubId}/fee`} className="sidebar-link active">
            <CreditCard size={19} />
            회비 관리
          </Link>

          <Link to="/club/schedule" className="sidebar-link">
            <CalendarDays size={19} />
            일정 관리 / 공지
          </Link>

          <Link to={`/club/${clubId}/survey`} className="sidebar-link">
            <MessageCircleHeart size={19} />
            만족도 조사
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


        {/*페이지 제목, 설명, 알림버튼, 사용자 프로필 영역*/}
        <main className="club-fee-main">
          <nav className='dashboard-breadcrumb'>
            <Link to="/main">플랫폼 메인</Link>
            <span>›</span>
            <Link to="/main">내 동아리</Link>
            <span>›</span>
            <span>{isClubLoading ? '불러오는 중...' : club?.name || '동아리'}</span>
            <span>›</span>
            <span className="breadcrumb-current">회비 관리</span>
          </nav>

          <header className="dashboard-header club-fee-page-header">
            <div>
              <p className="dashboard-label">Club Fees</p>
              <h1 className="club-fee-title">{currentPageName}</h1>

              <p className="dashboard-desc">
                회비 납부 현황과 수입 / 지출 내역을 관리할 수 있습니다.
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
          

        {/*영수증 일괄 다운로드, 엑셀 다운로드 버튼 영역*/}
        <FeeActionButtons onFeatureInProgress={showFeatureInProgress} />



        {/*상단 요약 카드 영역*/}
        <FeeSummaryCards
          summary={summary}
          unpaidMemberCount={unpaidMemberCount}
          totalMemberCount={totalMemberCount}
          paidMemberCount={paidMemberCount}
          paymentRate={paymentRate}
          formatWon={formatWon}
        />


        {/*수입 및 지출 내역 등록 UI영역*/}
        <section className="club-fee-content-grid">
          <div className="club-fee-left-column">


            {/*수입/지출 등록 폼 영역*/}
            <FeeRegisterForm
              transactionType = {transactionType} //현재 수입/지출 선택값 form에 넘김
              setTransactionType = {setTransactionType} //form 안 수입/지출 버튼을 통해 선택값 변경 가능
              currentBalance={summary?.balance || 0} //현재 잔액값 form에 넘김
              onSubmitTransaction={handleCreateTransaction} //form에서 등록 버튼 눌렀을 때 실행할 함수 넘김
              isSubmitting={isSubmitting}
            />


            {/*최근 수입/지출 내역 영역*/}
            <RecentTransactionTable
              transactions={transactions}
              allTransactions={allTransactions}
              isAllTransactionModalOpen={isTransactionModalOpen}
              isAllTransactionModalLoading={isTransactionModalLoading}
              onOpenAllTransactions={handleOpenTransactionModal}
              onCloseAllTransactions={() => setIsTransactionModalOpen(false)}
              formatWon={formatWon}
            />
          </div>


          <div className="club-fee-right-column">

            {/*회원별 납부 현황에 필요한 값*/}
            <MemberPaymentTable
              members={pagedMembers}
              memberFilter={memberFilter}
              setMemberFilter={setMemberFilter}
              memberSearch={memberSearch}
              setMemberSearch={setMemberSearch}
              currentPage={safeCurrentPage}
              setCurrentPage={setCurrentPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              totalPageCount={totalPageCount}
              pageStartIndex={pageStartIndex}
              pageEndIndex={pageEndIndex}
              totalCount={filteredMembers.length}
              formatWon={formatWon}
              onChangePaymentStatus={handleChangePaymentStatus}
            />


            {/*우 하단 카드 영역(sideStats가 null이라면 기능 구현중 메세지 출력*/}
            <FeeSideCards sideStats={sideStats} />
          </div>
        </section>
        </main>
      </div>
    </div>
  )
}

export default ClubFeePage
