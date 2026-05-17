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
  Settings,
  Users,
} from 'lucide-react'

//각 fee디렉터리의 컴포넌트 추가
import FeeActionButtons from './fee/components/FeeActionButtons.jsx'
import FeeSummaryCards from './fee/components/FeeSummary.jsx'
import FeeRegisterForm from './fee/components/FeeRegisterForm.jsx'
import RecentTransactionTable from './fee/components/RecentTransactionTable.jsx'
import MemberPaymentTable from './fee/components/MemberPaymentTable.jsx'
import FeeSideCards from './fee/components/FeeSideCards.jsx'
import { formatWon } from './fee/utils/feeFormat.js'

//왼쪽 사이드바, 로고, 사용자 프로필, 로그아웃 버튼 같은 기본 관리자 레이아웃을 재사용
import '../../styles/club/clubDashboard.css'
import '../../styles/club/clubFee.css'


//컴포넌트 시작
//회비 관리 페이지 담당하는 React 컴포넌트
function ClubFeePage() {
  const navigate = useNavigate() //로그아웃 후 로그인페이지 이동에 사용
  const { clubId } = useParams() //동아리의 ID를 가져오기위해 사용

  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {}

  const [members, setMembers] = useState([]) //회원별 납부현황 데이터 저장
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [sideStats, setSideStats] = useState(null)


  const [memberFilter, setMemberFilter] = useState('전체') //납부 현황 필터
  const [memberSearch, setMemberSearch] = useState('') //회원 검색창 입력값
  const [currentPage, setCurrentPage] = useState(1) //회원별 납부 현황의 페이지 번호
  const [pageSize, setPageSize] = useState(10) //한 페이지에 보여주는 인원 수
  const [transactionType, setTransactionType] = useState('수입') //수입/지출 등록 중 선택한 값

  const feePath = clubId ? `/clubs/${clubId}/fee` : '/club/fee'

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

  //프론트에서 회원 목록 10명씩 나눠 보여주는 로직(데이터 연동 시 삭제 예정) <백엔드 페이지네이션 시>
  const totalPageCount = Math.max(1, Math.ceil(filteredMembers.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPageCount)
  const pageStartIndex = (safeCurrentPage - 1) * pageSize
  const pageEndIndex = Math.min(pageStartIndex + pageSize, filteredMembers.length)
  const pagedMembers = filteredMembers.slice(pageStartIndex, pageEndIndex)

  //프론트 members배열을 통해 회원 수 납부 완료 여부, 납부율 계산(백엔드 페이지 네이션 사용시 수정)
  const totalMemberCount = members.length
  const paidMemberCount = members.filter((member) => member.status === '완료').length
  const unpaidMemberCount = members.filter((member) => member.status === '미납').length
  const paymentRate = totalMemberCount
    ? Math.round((paidMemberCount / totalMemberCount) * 100)
    : null

  useEffect(() => { //필터 및 검색어의 표시되는 개수 변경 시 1페이지로 이동
    setCurrentPage(1)
  }, [memberFilter, memberSearch, pageSize])

  useEffect(() => {
    if (currentPage > totalPageCount) {
      setCurrentPage(totalPageCount)
    }
  }, [currentPage, totalPageCount])

  const handleLogout = () => { //로그아웃 버튼 누르면 로그아웃, 로그인 페이지 이동(데이터 연동 시 수정)
    localStorage.removeItem('loginUser')
    navigate('/login')
  }

  const showFeatureInProgress = (featureName) => {
    alert(`${featureName} 기능은 현재 구현 중입니다. API 연동 후 제공될 예정입니다.`)
  }

useEffect(() => {
  // TODO: 백엔드 fees API 구현 후 이 위치에서 실제 회비 데이터를 불러오기
  // 예시:
  // const summaryData = await getFeeSummary(clubId)
  // const paymentData = await getFeePayments(clubId)
  // const transactionData = await getFeeTransactions(clubId)
  //
  // setSummary(summaryData)
  // setMembers(paymentData.results)
  // setTransactions(transactionData.results)
}, [clubId])


  //왼쪽 사이드바 및 오른쪽 메인 회비 페이지 구성 레이아웃//
  return (
    <div className="club-dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <LayoutDashboard size={22} />
          </div>

          <div>
            <strong>동아리 관리자</strong>
            <span>Club Management</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <Link to="/club/dashboard" className="sidebar-link">
            <LayoutDashboard size={19} />
            대시보드
          </Link>

          <div className="sidebar-menu-group">
            <div className="sidebar-link sidebar-parent-link">
              <FileText size={19} />
              동아리 정보
            </div>

            <div className="sidebar-submenu">
              <Link to="/club/edit" className="sidebar-sub-link">
                <Edit3 size={16} />
                동아리 정보 수정
              </Link>
            </div>
          </div>

          <Link to="/club/members" className="sidebar-link">
            <Users size={19} />
            동아리원 관리
          </Link>

          <Link to={feePath} className="sidebar-link active">
            <CreditCard size={19} />
            회비 관리
          </Link>

          <Link to="/club/schedule" className="sidebar-link">
            <CalendarDays size={19} />
            일정 관리
          </Link>

          <Link to="/club/settings" className="sidebar-link">
            <Settings size={19} />
            설정
          </Link>
        </nav>

        <button type="button" className="logout-button" onClick={handleLogout}>
          <LogOut size={18} />
          로그아웃
        </button>
      </aside>

        {/*페이지 제목, 설명, 알림버튼, 사용자 프로필 영역 (데이터 연동 시 동아리 이름 수정)*/}
      <main className="club-fee-main">
        <header className="club-fee-header"> 
          <div>
            <p className="club-fee-breadcrumb">
              플랫폼 메인 <span>&gt;</span>  동아리 이름 연동 필요{' '}
              <span>&gt;</span> <strong>회비 관리</strong>
            </p>

            <h1>회비 관리</h1>

            <p className="club-fee-desc">
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
                <strong>{loginUser.nickname || '김이준'}</strong>
                <span>관리자</span>
              </div>
            </div>
          </div>
        </header>


        <div className="fee-api-ready-notice">
          회비 데이터 API 연동 작업 전입니다.
        </div>


        <FeeActionButtons onFeatureInProgress={showFeatureInProgress} />


        <FeeSummaryCards
          summary={summary}
          unpaidMemberCount={unpaidMemberCount}
          totalMemberCount={totalMemberCount}
          paidMemberCount={paidMemberCount}
          paymentRate={paymentRate}
          formatWon={formatWon}
        />


        {/*수입 및 지출 내역 등록 UI영역 (데이터 연동 시 수정)*/}
        <section className="club-fee-content-grid">
          <div className="club-fee-left-column">


            <FeeRegisterForm
              transactionType = {transactionType}
              setTransactionType = {setTransactionType}
              onFeatureInProgress = {showFeatureInProgress}
            />


            <RecentTransactionTable
              transactions={transactions}
              formatWon={formatWon}
              onFeatureInProgress={showFeatureInProgress}
            />
          </div>


          <div className="club-fee-right-column">

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
              onFeatureInProgress={showFeatureInProgress}
            />


            <FeeSideCards sideStats={sideStats} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default ClubFeePage
