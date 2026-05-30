import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClub } from '../../api/clubs.js';
import '../../styles/club/clubDashboard.css';
import { getFeeTransactions, getFeeSummary, getFeePayments } from '../../api/fees.js';

import {
  Bell,
  CalendarDays,
  CreditCard,
  Edit3,
  FileText,
  Heart,
  HeartPulse,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Users,
  Wallet,
  UserX,
  Send,
  Paperclip,
  Smile,
  Database,
  ReceiptText,
  FileCheck2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';


function ClubDashboardPage() {
  const navigate = useNavigate();
  const { clubId } = useParams();

  // 1. 동아리 정보 상태
  const [club, setClub] = useState(null);
  // 1-1. 동아리 정보를 불러오는 중인지 확인하는 상태
  const [isClubLoading, setIsClubLoading] = useState(true);

  // 2. 공지사항 상태
  const [noticeText, setNoticeText] = useState('');
  const [notices, setNotices] = useState([]);

  // 3. 로그인 사용자 정보
  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {};
  // 3-1. 로그인한 사용자가 동아리 운영진인지 확인
  // CLUB_MANAGER 역할을 가진 사용자에게만 동아리 정보 수정 메뉴를 보여줌
  const isClubManager = loginUser.role === 'CLUB_MANAGER';



  // 대시보드 회비 요약 카드에 사용할 전체 수입/지출 내역
  // 기존 회비 관리 페이지의 수입/지출 API 데이터를 대시보드에서도 재사용
  const [feeTransactions, setFeeTransactions] = useState([]);

  // 회비 데이터를 불러오는 중인지 표시하기 위한 상태
  const [isFeeLoading, setIsFeeLoading] = useState(false);

  // "수입/지출 내역 보기" 버튼 클릭 시 전체 내역 모달을 열기 위한 상태
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);

  // 특정 거래 내역의 증빙자료 버튼을 클릭했을 때 보여줄 영수증 목록
  const [selectedReceipts, setSelectedReceipts] = useState(null);

  // getFeeSummary API의 balance 값을 저장한다.
  const [feeSummary, setFeeSummary] = useState(null);

  // getFeePayments API의 summary 값을 저장한다.
  const [feePaymentSummary, setFeePaymentSummary] = useState(null);



  // 4. 동아리 정보 가져오기
  useEffect(() => {
    const fetchClub = async () => {
      try {
        const data = await getClub(clubId);
        setClub(data);
      } catch (error) {
        console.error('동아리 정보를 불러오지 못했습니다.', error);
      } finally {
        setIsClubLoading(false);
      }
    };

    fetchClub();
  }, [clubId]);


  // 대시보드 회비 관리 카드에서 사용할 전체 수입/지출 내역 조회
  // 상단 요약 카드의 회비 잔액/미납 인원과 하단 회비 카드의 수입·지출 내역을 함께 불러온다.
  useEffect(() => {
    const loadDashboardFeeData = async () => {
      if (!clubId) return;

      try {
        setIsFeeLoading(true);

        // 1. 회비 잔액 요약 데이터 조회
        const summaryData = await getFeeSummary(clubId);

        // 2. 회원별 납부 현황 요약 데이터 조회
        const paymentData = await getFeePayments(clubId);

        // 3. 전체 수입/지출 내역 조회
        const transactionData = await getFeeTransactions(clubId, { limit: 'all' });

        // 4. 각 API 응답을 대시보드 상태에 저장
        setFeeSummary(summaryData || null);
        setFeePaymentSummary(paymentData?.summary || null);
        setFeeTransactions(transactionData.results || []);
      } catch (error) {
        console.error('대시보드 회비 데이터 조회 실패:', error);

        // 에러 발생 시 기본값 처리
        setFeeSummary(null);
        setFeePaymentSummary(null);
        setFeeTransactions([]);
      } finally {
        setIsFeeLoading(false);
      }
    };

    loadDashboardFeeData();
  }, [clubId]);



  // 5. 로그아웃 함수
  const handleLogout = () => {
    localStorage.removeItem('loginUser');
    navigate('/login');
  };

  // 6. 공지사항 등록 함수
  const handleAddNotice = () => {
    if (noticeText.trim() === '') return;

    const newNotice = {
      id: Date.now(),
      content: noticeText,
      createdAt: new Date().toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setNotices([newNotice, ...notices]);
    setNoticeText('');
  };


  // 대시보드 회비 카드와 모달에서 금액을 보기 좋게 표시하기 위한 함수
  const formatDashboardWon = (amount) => {
    const numericAmount = Number(amount || 0);
    return `${numericAmount.toLocaleString('ko-KR')}원`;
  };

  // 대시보드 회비 관리 카드에서 사용할 월별 요약 지표 계산
  const monthlyFeeStats = useMemo(() => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 1. 전체 수입/지출 내역 중 "이번 달"에 해당하는 내역만 필터링
  const monthlyTransactions = feeTransactions.filter((transaction) => {
    if (!transaction.date) return false;

    const [year, month] = String(transaction.date)
      .split('-')
      .map(Number);

    return year === currentYear && month === currentMonth;
  });

  // 2. 이번 달 수입 건수 계산
  const incomeCount = monthlyTransactions.filter(
    (transaction) => transaction.type === '수입',
  ).length;

  // 3. 이번 달 지출 건수 계산
  const expenseCount = monthlyTransactions.filter(
    (transaction) => transaction.type === '지출',
  ).length;

  // 4. 증빙자료 첨부율은 수입/지출 전체 내역을 기준으로 계산
  const receiptTargetCount = monthlyTransactions.length;

  // 5. 이번 달 수입/지출 내역 중 증빙자료가 1개 이상 첨부된 건수 계산
  const receiptAttachedCount = monthlyTransactions.filter(
    (transaction) => transaction.receipts?.length > 0,
  ).length;

  // 6. 수입/지출 전체 기준 증빙자료 첨부율 계산, 이번 달 수입/지출 내역이 0건이면 0으로 처리
  const receiptRate = receiptTargetCount
    ? Math.round((receiptAttachedCount / receiptTargetCount) * 100)
    : 0;

  return {
    monthlyTransactions,
    incomeCount,
    expenseCount,
    receiptTargetCount,
    receiptAttachedCount,
    receiptRate,
  };
}, [feeTransactions]);


  
  return (
    <div className="club-dashboard-page">
      <div className="dashboard-fixed-canvas">
        {/* 왼쪽 사이드바 영역 */}
        <aside className="dashboard-sidebar">
          {/* 사이드바 상단 로고 영역 */}
          <div className="sidebar-logo">
            <Link to="/main" className="sidebar-clubflow-logo">
              <span className="sidebar-logo-cf">CM</span>
              <span className="sidebar-logo-text">Club Management</span>
            </Link>
          </div>

        {/* 사이드바 메뉴 영역 */}
        <nav className="sidebar-menu">
          {/* 현재 페이지이므로 active 클래스 적용 */}
          <Link to={`/club/${clubId}/dashboard`} className="sidebar-link active">
            <LayoutDashboard size={19} />
            대시보드
          </Link>

        <div className="sidebar-menu-group">
          {/* 상위 메뉴: 동아리 정보 확인 페이지로 이동 */}
          <Link to={`/club/${clubId}/info`} className="sidebar-link sidebar-parent-link">
            <FileText size={19} />
            동아리 정보
          </Link>

          {/* 하위 메뉴: 운영진용 동아리 정보 수정 페이지 */}
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

          <Link to={`/club/${clubId}/fee`} className="sidebar-link">
            <CreditCard size={19} />
            회비 관리
          </Link>

          <Link to={`/club/${clubId}/events`} className="sidebar-link">
            일정·출석 관리
          </Link>

          <Link to="/club/settings" className="sidebar-link">
            <HeartPulse size={19} />
            건강도 분석
          </Link>
        </nav>

        {/* 로그아웃 버튼 */}
        <button type="button" className="logout-button" onClick={handleLogout}>
          <LogOut size={18} />
          로그아웃
        </button>
      </aside>


        {/* 오른쪽 대시보드 전체 영역 */}
        <main className="dashboard-main">
          <div className="dashboard-frame">
          
            {/* 브레드크럼 */}
              <nav className="dashboard-breadcrumb">
                <Link to="/main">플랫폼 메인</Link>
                <span>›</span>
                <Link to="/main">내 동아리</Link>
                <span>›</span>
                <span>{isClubLoading ? '불러오는 중...' : club?.name || '동아리'}</span>
                <span>›</span>
                <span className="breadcrumb-current">대시보드</span>
              </nav>

            {/* 대시보드 상단 헤더 */}
            <header className="dashboard-header">
              <div>
                <p className="dashboard-label">Dashboard</p>
                <h1>동아리 운영 대시보드</h1>
                <p className="dashboard-desc">
                  동아리 운영 현황을 한 화면에서 확인할 수 있습니다.
                </p>
              </div>

              {/* 오른쪽 사용자 정보 영역 */}
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
                    <span>{loginUser.school_name || '학교 정보 없음'}</span>
                  </div>
                </div>
              </div>
            </header>

            {/* 상단 주요 현황 요약 카드 영역 */}
            <section className="summary-grid">
              <article className="summary-card">
                <div className="summary-icon members">
                  <Users size={22} />
                </div>

                <div>
                  <span>총 동아리원</span>
                  <strong>{club?.member_count ?? 0}명</strong>
                  <p>현재 활동 중인 동아리원 수입니다.</p>
                </div>
              </article>

              <article className="summary-card">
                <div className="summary-icon health">
                  <HeartPulse size={22} />
                </div>

                <div>
                  <span>동아리 건강도 점수</span>
                  <strong>-</strong>
                  <p>데이터 연동 전입니다.</p>
                </div>
              </article>

              <article className="summary-card">
                <div className="summary-icon balance">
                  <Wallet size={22} />
                </div>

                <div>
                  <span>회비 잔액</span>
                  <strong>
                    {isFeeLoading ? '-' : formatDashboardWon(feeSummary?.balance ?? 0)}
                  </strong>
                  <p>현재 회비의 잔액입니다.</p>
                </div>
              </article>

              <article className="summary-card">
                <div className="summary-icon unpaid">
                  <UserX size={22} />
                </div>

                <div>
                  <span>미납 인원</span>
                  <strong>
                    {isFeeLoading ? '-' : `${feePaymentSummary?.unpaidMemberCount ?? 0}명`}
                  </strong>
                  <p>전체 {feePaymentSummary?.totalMemberCount ?? 0}명 중 미납</p>
                </div>
              </article>
            </section>

            {/* 대시보드 본문 영역 */}
            <section className="dashboard-content-grid">
              {/* 공지사항 패널 */}
              <article className="dashboard-panel notice-panel">
                <div className="panel-title-row">
                  <div>
                    <h2>공지사항</h2>
                    <p>공지 데이터가 등록되면 이 영역에 표시됩니다.</p>
                  </div>

                  <Megaphone size={21} />
                </div>

                <div className="notice-body">
                  {/* 공지사항 목록이 표시되는 영역 */}
                  <div className="notice-list">
                    {/* 등록된 공지사항이 없을 때 보여줄 빈 상태 화면 */}
                    {notices.length === 0 ? (
                      <div className="notice-empty-box">
                        <div className="empty-icon">
                          <Megaphone size={26} />
                        </div>

                        <h3>등록된 공지사항이 없습니다.</h3>
                        <p>아래 입력창에 공지사항을 입력하면 이 영역에 바로 표시됩니다.</p>
                      </div>
                    ) : (
                      // 등록된 공지사항이 있을 때 공지 목록을 반복해서 출력
                      notices.map((notice) => (
                        <div className="notice-item" key={notice.id}>
                          <div className="notice-item-icon">
                            <Megaphone size={17} />
                          </div>

                          <div>
                            {/* 공지 내용 */}
                            <p>{notice.content}</p>

                            {/* 공지 등록 시간 */}
                            <span>{notice.createdAt}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 공지사항 입력창과 등록 버튼 영역 */}
                  <div className="notice-input-row">
                    <div className="notice-input-box">
                      <input
                        type="text"
                        placeholder="공지사항을 입력하세요..."
                        value={noticeText}
                        onChange={(e) => setNoticeText(e.target.value)}
                        onKeyDown={(e) => {
                          // Enter 키를 누르면 공지 등록 함수 실행
                          if (e.key === 'Enter') {
                            handleAddNotice();
                          }
                        }}
                      />

                      {/* 첨부파일 아이콘 버튼: 현재는 디자인용, 기능은 추후 구현 */}
                      <button type="button" className="notice-icon-button">
                        <Paperclip size={20} />
                      </button>

                      {/* 이모지 아이콘 버튼: 현재는 디자인용, 기능은 추후 구현 */}
                      <button type="button" className="notice-icon-button">
                      <Smile size={20} />
                      </button>
                    </div>

                      {/* 공지 등록 버튼 */}
                    <button
                      type="button"
                      className="notice-submit-button"
                      onClick={handleAddNotice}
                    >
                      <Send size={18} />
                      공지 등록
                    </button>
                  </div>
                </div>
              </article>

              {/* 활동 일정 패널 */}
              <article className="dashboard-panel activity-panel">
                <div className="panel-title-row">
                  <div>
                    <h2>활동 일정</h2>
                    <p>활동 일정 데이터가 등록되면 표시됩니다.</p>
                  </div>

                  <CalendarDays size={21} />
                </div>

                <div className="empty-panel">
                  <p>등록된 활동 일정이 없습니다.</p>
                </div>
              </article>

              {/* 회비 관리 패널 */}
              <article className="dashboard-panel fee-panel">
                <div className="panel-title-row dashboard-fee-title-row">
                  <div>
                    <h2>회비 관리</h2>
                    <p>이번 달 수입·지출 건수와 증빙 현황입니다.</p>
                  </div>

                  {/* 전체 수입/지출 내역 모달을 여는 버튼 */}
                  <button
                    type="button"
                    className="dashboard-fee-detail-button"
                    onClick={() => setIsFeeModalOpen(true)}
                    disabled={isFeeLoading}
                  >
                    수입/지출 내역 보기
                  </button>
                </div>

                {/* 회비 데이터를 불러오는 중일 때 표시 */}
                {isFeeLoading ? (
                  <div className="empty-panel">
                    <p>회비 데이터를 불러오는 중입니다.</p>
                  </div>
                ) : feeTransactions.length === 0 ? (
                  <div className="empty-panel">
                    <p>등록된 회비 내역이 없습니다.</p>
                  </div>
                ) : (
                  <div className="dashboard-fee-preview">
                    {/* 이번 달 수입/지출 건수 카드 */}
                    <div className="dashboard-fee-count-grid">
                      <div className="dashboard-fee-count-card income">
                        <div className="dashboard-fee-count-icon">
                          <Wallet size={22} />
                          <ArrowUpRight size={15} className="dashboard-fee-corner-icon" />
                        </div>

                        <div>
                          <span>수입</span>
                          <strong>{monthlyFeeStats.incomeCount}건</strong>
                        </div>
                      </div>

                      <div className="dashboard-fee-count-card expense">
                        <div className="dashboard-fee-count-icon">
                          <ReceiptText size={22} />
                          <ArrowDownRight size={15} className="dashboard-fee-corner-icon" />
                        </div>

                        <div>
                          <span>지출</span>
                          <strong>{monthlyFeeStats.expenseCount}건</strong>
                        </div>
                      </div>
                    </div>

                    {/* 증빙자료 첨부율 원형 도표 */}
                    <div className="dashboard-receipt-rate-box">
                      <div
                        className="dashboard-receipt-chart"
                        style={{
                          background: `conic-gradient(
                            #4f63e7 0deg ${monthlyFeeStats.receiptRate * 3.6}deg,
                            #e5e7eb ${monthlyFeeStats.receiptRate * 3.6}deg 360deg
                          )`,
                        }}
                      >
                        <div className="dashboard-receipt-chart-inner">
                          {monthlyFeeStats.receiptRate}%
                        </div>
                      </div>

                      <div className="dashboard-receipt-text">
                        <div className="dashboard-receipt-title">
                          <FileCheck2 size={17} />
                          <span>증빙자료 첨부율</span>
                        </div>

                        {monthlyFeeStats.receiptTargetCount > 0 ? (
                          <strong>
                            수입/지출 {monthlyFeeStats.receiptTargetCount}건 중{' '}
                            {monthlyFeeStats.receiptAttachedCount}건 첨부
                          </strong>
                        ) : (
                          <strong>이번 달 수입/지출 내역이 없습니다.</strong>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>


              {/* 달력 패널: 제목 없이 달력만 표시 */}
              <article className="dashboard-panel calendar-panel">
                <div className="calendar-box">
                  <div className="calendar-week">
                    <span>일</span>
                    <span>월</span>
                    <span>화</span>
                    <span>수</span>
                    <span>목</span>
                    <span>금</span>
                    <span>토</span>
                  </div>

                  <div className="calendar-grid">
                    {Array.from({ length: 35 }).map((_, index) => (
                      <div className="calendar-cell" key={index}>
                        <span>{index + 1 <= 31 ? index + 1 : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>


            {/* 수입/지출 내역 보기 버튼 클릭 시 표시되는 전체 내역 */}
            {isFeeModalOpen && (
              <div
                className="dashboard-modal-backdrop"
                onClick={() => setIsFeeModalOpen(false)}
              >
                <div
                  className="dashboard-transaction-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="dashboard-modal-header">
                    <h3>전체 수입 / 지출 내역</h3>

                    <button
                      type="button"
                      onClick={() => setIsFeeModalOpen(false)}
                    >
                      닫기
                    </button>
                  </div>

                  <div className="dashboard-transaction-table-wrap">
                    <table className="dashboard-transaction-table">
                      <thead>
                        <tr>
                          <th>날짜</th>
                          <th>구분</th>
                          <th>내용</th>
                          <th>카테고리</th>
                          <th>금액</th>
                          <th>관련 대상</th>
                          <th>메모</th>
                          <th>증빙자료</th>
                        </tr>
                      </thead>

                      <tbody>
                        {feeTransactions.length > 0 ? (
                          feeTransactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td>{transaction.date}</td>

                              <td>
                                <span
                                  className={`dashboard-transaction-badge ${
                                    transaction.type === '수입'
                                      ? 'income'
                                      : 'expense'
                                  }`}
                                >
                                  {transaction.type}
                                </span>
                              </td>

                              <td>{transaction.content}</td>
                              <td>{transaction.category}</td>

                              <td
                                className={`dashboard-amount ${
                                  transaction.amount > 0 ? 'income' : 'expense'
                                }`}
                              >
                                {transaction.amount > 0 ? '+' : ''}
                                {formatDashboardWon(transaction.amount)}
                              </td>

                              <td>{transaction.target || '-'}</td>
                              <td className="dashboard-transaction-memo-cell">
                                {transaction.memo || '-'}
                              </td>

                              <td>
                                {transaction.receipts?.length > 0 ? (
                                  <button
                                    type="button"
                                    className="dashboard-receipt-open-button"
                                    onClick={() =>
                                      setSelectedReceipts(transaction.receipts)
                                    }
                                  >
                                    첨부 {transaction.receipts.length}개
                                  </button>
                                ) : (
                                  <span className="dashboard-receipt-empty">
                                    미첨부
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8">
                              등록된 수입 / 지출 내역이 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


             {/* 거래 내역의 "첨부 N개" 버튼 클릭 시 표시되는 증빙자료 모달 */}
            {selectedReceipts && (
              <div
                className="dashboard-modal-backdrop"
                onClick={() => setSelectedReceipts(null)}
              >
                <div
                  className="dashboard-receipt-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="dashboard-modal-header">
                    <h3>영수증 증빙 자료</h3>

                    <button
                      type="button"
                      onClick={() => setSelectedReceipts(null)}
                    >
                      닫기
                    </button>
                  </div>

                  <div className="dashboard-receipt-preview-list">
                    {selectedReceipts.map((receipt) => {
                      const receiptName = receipt.name || '';
                      const receiptUrl = receipt.url || '';

                      // 파일명이 .pdf로 끝나면 iframe으로 PDF를 보여주고 그 외에는 이미지 파일로 판단해 img 태그로 보여준다.
                      const isPdf = receiptName.toLowerCase().endsWith('.pdf');

                      return (
                        <div
                          key={receipt.id}
                          className="dashboard-receipt-preview-item"
                        >
                          <p>{receiptName}</p>

                          {isPdf ? (
                            <iframe
                              src={receiptUrl}
                              title={receiptName}
                              className="dashboard-receipt-pdf-preview"
                            />
                          ) : (
                            <img
                              src={receiptUrl}
                              alt={receiptName}
                              className="dashboard-receipt-image-preview"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}


          </div>
        </main>
      </div>
    </div>
  );
}
export default ClubDashboardPage;