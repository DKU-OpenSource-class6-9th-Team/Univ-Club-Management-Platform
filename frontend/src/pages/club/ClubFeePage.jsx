import { useEffect, useMemo, useState } from 'react' //바뀌는 값, 계산결과 저장, 값 변경 시 자동 실행
import { Link, useNavigate, useParams } from 'react-router-dom'
import { //icon 삽입
  Bell,
  CalendarDays,
  CreditCard,
  Download,
  Edit3,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'

//왼쪽 사이드바, 로고, 사용자 프로필, 로그아웃 버튼 같은 기본 관리자 레이아웃을 재사용
import '../../styles/club/clubDashboard.css'
import '../../styles/club/clubFee.css'

const memberNames = [ //임시 데이터
  '김이준', '박서연', '이동호', '최유진', '정민우', '김지나', '오지민', '류지원',
  '강하늘', '윤지민', '한서준', '임수아', '최도윤', '문하린', '정시우', '오유나',
  '김민석', '배지훈', '서나은', '이서현', '권유진', '조민재', '송예린', '남태현',
  '장서윤', '홍지우', '신동현', '유가은', '황준서', '백소율', '문지호', '노서아',
]

const departments = [ //임시 데이터
  '사진학과',
  '시각디자인학과',
  '경영학과',
  '컴퓨터공학과',
  '미디어커뮤니케이션학과',
  '산업디자인학과',
]

const unpaidMemberIds = [2, 5, 7, 12, 15, 19, 23, 27] //임시 데이터
const initialMembers = memberNames.map((name, index) => { //임시적 데이터 모델 생성
  const id = index + 1
  const status = unpaidMemberIds.includes(id) ? '미납' : '완료'
  const isPartialExample = id === 3

  return {
    id,
    name,
    department: departments[index % departments.length],
    studentId: String(20 + (index % 5)),
    status,
    amount: status === '완료' ? (isPartialExample ? 20000 : 50000) : 0,
    paidDate: status === '완료' ? `2024.05.${String(8 + (index % 9)).padStart(2, '0')}` : '-',
    memo: isPartialExample
      ? '잔액 30,000원'
      : id === 7 || id === 23
        ? '2회 이상 미납'
        : id === 5
          ? '입금 예정'
          : '-',
  }
})

//최근 수입/지출 임시 데이터(데이터 연동 시 삭제예정)
const recentTransactions = [
  { id: 1, date: '2024.05.12', type: '수입', content: '동아리 회비 월별 16명', category: '회비', amount: 800000, receipt: '첨부' },
  { id: 2, date: '2024.05.11', type: '수입', content: '사진전 행사 후원금', category: '후원', amount: 100000, receipt: '첨부' },
  { id: 3, date: '2024.05.09', type: '지출', content: '4월 출사 교통비', category: '활동비', amount: -120000, receipt: '첨부' },
  { id: 4, date: '2024.05.05', type: '지출', content: '필름 현상 재료비', category: '재료비', amount: -40000, receipt: '첨부' },
]

function formatWon(value) { //1000단위 ,삽입 및 '원' 형식으로 만드는 함수
  return `${value.toLocaleString()}원`
}

//컴포넌트 시작
//회비 관리 페이지 담당하는 React 컴포넌트
function ClubFeePage() {
  const navigate = useNavigate() //로그아웃 후 로그인페이지 이동에 사용
  const { clubId } = useParams() //동아리의 ID를 가져오기위해 사용

  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {}

  const [members, setMembers] = useState(initialMembers) //회원별 납부현황 데이터 저장(수정 예정)
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
    : 0

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

  //회원 납부 상태 클릭 시 완료 <-> 미납 상태로 변경
  // (데이터 연동 시 수정)
  const handleTogglePaymentStatus = (memberId) => {
    setMembers((prevMembers) =>
      prevMembers.map((member) => {
        if (member.id !== memberId) {
          return member
        }

        const nextStatus = member.status === '완료' ? '미납' : '완료'

        return {
          ...member,
          status: nextStatus,
          amount: nextStatus === '완료' ? 50000 : 0,
          paidDate: nextStatus === '완료' ? '2024.05.16' : '-',
          memo: nextStatus === '완료' ? '-' : member.memo === '-' ? '상태 변경됨' : member.memo,
        }
      }),
    )
  }


  const handleRegisterSubmit = (event) => { //수정 예정
    event.preventDefault()
    alert('수입 / 지출 등록 기능은 이후 Django API와 연결할 예정입니다.')
  }


  //왼쪽 사이드바 및 오른쪽 메인 회비 페이지 구성 레이아웃//
  return (
    <div className="club-dashboard-page">
      <div className="dashboard-fixed-canvas">
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
          <Link to={`/club/${clubId}/dashboard`} className="sidebar-link">
            <LayoutDashboard size={19} />
            대시보드
          </Link>

          <Link to={`/club/${clubId}/info`} className="sidebar-link sidebar-parent-link">
            <FileText size={19} />
            동아리 정보
          </Link>

          <Link to={`/club/${clubId}/edit`} className="sidebar-sub-link">
            <Edit3 size={16} />
            동아리 정보 수정
          </Link>

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

        {/*다운로드 버튼 영역(모든 작업 완료 시 추가로 구현 예정, 힘들다면 이후 삭제)*/}
        <div className="club-fee-actions">
          <button type="button">
            <Download size={16} />
            영수증 일괄 다운로드
          </button>

          <button type="button">
            <FileText size={16} />
            엑셀 다운로드
          </button>
        </div>

        {/*회비 잔액, 이번달 수입 및 지출, 미납회원 ,납부율 카드 영역 (데이터 연동 시 값연동 수정예정)*/}
        <section className="club-fee-summary-grid">
          <article className="club-fee-summary-card">
            <div className="club-fee-summary-icon balance">
              <Wallet size={22} />
            </div>

            <div>
              <span>총 회비 잔액</span>
              <strong>{formatWon(1250000)}</strong>
              <p>총 수입 1,250,000원</p>
            </div>
          </article>

          <article className="club-fee-summary-card">
            <div className="club-fee-summary-icon income">↗</div>

            <div>
              <span>이번 달 수입</span>
              <strong>{formatWon(890000)}</strong>
              <p className="positive">전월 대비 +210,000원</p>
            </div>
          </article>

          <article className="club-fee-summary-card">
            <div className="club-fee-summary-icon expense">↘</div>

            <div>
              <span>이번 달 지출</span>
              <strong>{formatWon(640000)}</strong>
              <p className="negative">전월 대비 -120,000원</p>
            </div>
          </article>

          <article className="club-fee-summary-card">
            <div className="club-fee-summary-icon unpaid">
              <Users size={22} />
            </div>

            <div>
              <span>미납 회원</span>
              <strong>{unpaidMemberCount}명</strong>
              <p>총 {totalMemberCount}명 중</p>
            </div>
          </article>

          <article className="club-fee-summary-card">
            <div className="club-fee-summary-icon rate">%</div>

            <div>
              <span>납부율</span>
              <strong>{paymentRate}%</strong>
              <p>
                완료 {paidMemberCount}명 / 전체 {totalMemberCount}명
              </p>
            </div>
          </article>
        </section>

        {/*수입 및 지출 내역 등록 UI영역 (데이터 연동 시 수정)*/}
        <section className="club-fee-content-grid">
          <div className="club-fee-left-column">
            <section className="club-fee-panel fee-register-panel">
              <div className="club-fee-panel-title">
                <h2>수입 / 지출 내역 등록</h2>
              </div>

              <form onSubmit={handleRegisterSubmit}>
                <div className="fee-register-tabs">
                  <button
                    type="button"
                    className={transactionType === '수입' ? 'active' : ''}
                    onClick={() => setTransactionType('수입')}
                  >
                    수입
                  </button>

                  <button
                    type="button"
                    className={transactionType === '지출' ? 'active' : ''}
                    onClick={() => setTransactionType('지출')}
                  >
                    지출
                  </button>
                </div>

                <div className="fee-register-form-grid">
                  <label>
                    <span className="required-label">날짜</span>
                    <input type="date" defaultValue="2024-05-12" />
                  </label>

                  <label>
                    <span className="required-label">내용</span>
                    <input type="text" placeholder="내용을 입력하세요" />
                  </label>

                  <label>
                    <span className="required-label">카테고리</span>
                    <select defaultValue="">
                      <option value="" disabled>
                        카테고리 선택
                      </option>
                      <option>회비</option>
                      <option>활동비</option>
                      <option>운영/관리비</option>
                      <option>기타</option>
                    </select>
                  </label>

                  <label>
                    <span className="required-label">금액</span>
                    <div className="amount-input-wrap">
                      <input type="number" placeholder="금액 입력" />
                      <span className="amount-unit">원</span>
                    </div>
                  </label>

                  <label>
                    <span>관련 대상 / 항목</span>
                    <input type="text" placeholder="관련 대상 또는 항목 입력" />
                  </label>

                  <label>
                    <span>예산 / 메모 (선택)</span>
                    <input type="text" placeholder="메모를 입력하세요" />
                  </label>
                </div>

                <div className="fee-register-bottom-row">
                  <div className="fee-receipt-upload-section">
                    <p className="upload-section-title">영수증 첨부 (선택)</p>

                    <div className="fee-register-upload-box">
                      <FileText size={18} />
                      <strong>파일을 드래그하거나 클릭하여 첨부하세요</strong>
                      <span>JPG, PNG, PDF 최대 10MB</span>
                    </div>
                  </div>

                  <div className="fee-balance-card">
                    <span className="fee-balance-label">예상 잔액 (변경)</span>
                    <strong>1,250,000원</strong>
                    <p>
                      총 수입 (현재)
                      <span>1,040,000원</span>
                    </p>
                    <p>
                      등록 후 (변경)
                      <span className="positive">+210,000원</span>
                    </p>
                  </div>
                </div>

                <div className="fee-register-actions">
                  <button type="button" className="secondary-btn">
                    초기화
                  </button>

                  <button type="submit" className="primary">
                    등록
                  </button>
                </div>
              </form>
            </section>

            <section className="club-fee-panel">
              <div className="club-fee-table-header">
                <div>
                  <h2>최근 수입 / 지출 내역</h2>
                  <p>최근 등록된 회비 수입과 지출 내역입니다.</p>
                </div>

                <button type="button">더보기</button>
              </div>

              <table className="club-fee-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>구분</th>
                    <th>내용</th>
                    <th>카테고리</th>
                    <th>금액</th>
                    <th>영수증</th>
                  </tr>
                </thead>

                {/*임시데이터 최근 수입/ 지출 내역 출력(수정 예정)*/}
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.date}</td>

                      <td>
                        <span
                          className={`transaction-badge ${
                            transaction.type === '수입' ? 'income' : 'expense'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>

                      <td>{transaction.content}</td>
                      <td>{transaction.category}</td>

                      <td className={transaction.amount > 0 ? 'positive' : 'negative'}>
                        {transaction.amount > 0 ? '+' : ''}
                        {formatWon(transaction.amount)}
                      </td>

                      <td>{transaction.receipt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

            {/*회원 납부 상태 테아블 출력 및 필터, 검색*/}
            {/*(데이터 연동 시 데이터 관련 수정 예정)*/}
          <div className="club-fee-right-column">
            <section className="club-fee-panel member-payment-panel">
              <div className="club-fee-table-header member-table-header">
                <div>
                  <h2>회원별 납부 현황</h2>
                  <p>납부 상태를 클릭하면 완료 / 미납 상태를 변경할 수 있습니다.</p>
                </div>

                <input
                  type="text"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="이름, 학과, 학번 검색"
                />
              </div>

              <div className="club-fee-filter-tabs">
                {['전체', '완료', '미납'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={memberFilter === filter ? 'active' : ''}
                    onClick={() => setMemberFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <table className="club-fee-table member-payment-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>학과 / 학번</th>
                    <th>납부 상태</th>
                    <th>납부 금액</th>
                    <th>납부일</th>
                    <th>비고</th>
                  </tr>
                </thead>

                <tbody>
                  {pagedMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>

                      <td>
                        {member.department} {member.studentId}학번
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`payment-status ${
                            member.status === '완료' ? 'paid' : 'unpaid'
                          }`}
                          onClick={() => handleTogglePaymentStatus(member.id)}
                        >
                          {member.status} ▾
                        </button>
                      </td>

                      <td>{formatWon(member.amount)}</td>
                      <td>{member.paidDate}</td>
                      <td>{member.memo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

                  {/*페이지 번호 생성 및 출력(데이터 연동 시 수정)*/}
              <div className="member-pagination-row">
                <span>
                  {filteredMembers.length === 0 ? 0 : pageStartIndex + 1} - {pageEndIndex} of{' '}
                  {filteredMembers.length}
                </span>

                <div className="member-pagination-controls">
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    ‹
                  </button>

                  {Array.from({ length: totalPageCount }).map((_, index) => {
                    const pageNumber = index + 1

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        className={safeCurrentPage === pageNumber ? 'active' : ''}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    disabled={safeCurrentPage === totalPageCount}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPageCount, page + 1))
                    }
                  >
                    ›
                  </button>
                </div>

                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  <option value={10}>10개씩</option>
                  <option value={20}>20개씩</option>
                  <option value={30}>30개씩</option>
                </select>
              </div>
            </section>

            {/*이의제기, 만족도 현황, 회비 사용 증빙 상태 카드 영역*/}
            <section className="club-fee-side-card-grid">
              <article className="club-fee-side-card">
                <Megaphone size={22} />
                <span>이번달 이의제기</span>
                <strong>1건</strong>
                <p>진행 중 1건</p>
              </article>

              <article className="club-fee-side-card">
                <HeartPulse size={22} />
                <span>만족도 투표</span>
                <strong>82%</strong>
                <p>참여율 68%</p>
              </article>

              <article className="club-fee-side-card">
                <FileText size={22} />
                <span>회비 사용 증빙</span>
                <strong>88%</strong>
                <p>7 / 8건 첨부</p>
              </article>
            </section>
          </div>
        </section>
        </main>
      </div>
    </div>
  )
}

export default ClubFeePage
