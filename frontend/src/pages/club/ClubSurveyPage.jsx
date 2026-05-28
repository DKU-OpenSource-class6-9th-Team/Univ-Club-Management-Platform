import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClub } from '../../api/clubs.js';
import { getFeeTransactions } from '../../api/fees.js';

import {
  getMonthlySurvey,
  saveSurveyItems,
  saveMonthlySurveyDraft,
  submitMonthlySurvey,
} from '../../api/surveys.js';

import '../../styles/club/clubDashboard.css';
import '../../styles/club/clubSurvey.css';

import {
  Bell,
  CalendarDays,
  Check,
  CreditCard,
  Edit3,
  FileText,
  HeartPulse,
  Info,
  LayoutDashboard,
  LogOut,
  MessageCircleHeart,
  Star,
  Users,
  X,
} from 'lucide-react';

/*
  만족도 점수 라벨
  배열 index + 1을 점수로 사용함.
  예: 매우 나쁨 = 1점, 매우 좋음 = 5점
*/
const ratingLabels = ['매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'];

/*
  날짜를 화면 표시용으로 변환하는 함수
  예: 2025.05.25 (일)
*/
const formatSurveyDate = (date) => {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dayName = dayNames[date.getDay()];

  return `${year}.${month}.${day} (${dayName})`;
};

/*
  현재 날짜 기준으로 2주 단위 만족도 조사 기간을 계산하는 함수

  기준:
  - 1차 조사: 매월 1일 ~ 14일
  - 2차 조사: 매월 15일 ~ 말일
*/
const getCurrentBiweeklySurveyPeriod = () => {
  const today = new Date();

  const year = today.getFullYear();
  const monthIndex = today.getMonth();
  const todayDate = today.getDate();

  let startDate;
  let endDate;
  let roundLabel;

  if (todayDate <= 14) {
    startDate = new Date(year, monthIndex, 1);
    endDate = new Date(year, monthIndex, 14);
    roundLabel = '1차';
  } else {
    startDate = new Date(year, monthIndex, 15);
    endDate = new Date(year, monthIndex + 1, 0);
    roundLabel = '2차';
  }

  const todayOnly = new Date(year, monthIndex, todayDate);
  const endDateOnly = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );

  const diffTime = endDateOnly - todayOnly;
  const remainingDays = Math.max(
    Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
    0
  );

  // monthIndex는 0부터 시작하므로 +1을 해서 실제 월 숫자를 반환
  return {
    month: monthIndex + 1,
    roundLabel,
    startDate,
    endDate,
    remainingDays,
  };
};

function ClubSurveyPage() {
  const navigate = useNavigate();

  // URL에서 clubId를 가져옴. 예: /club/3/survey 라면 clubId는 3
  const { clubId } = useParams();

  // localStorage에 저장된 로그인 사용자 정보 가져오기.
  // 사이드바 권한 처리, 상단 사용자 정보 표시에 사용함.
  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {};

  // 동아리 운영진 여부 확인.
  // 운영진일 때만 동아리 정보 수정 메뉴를 보여줌.
  const isClubManager = loginUser.role === 'CLUB_MANAGER';

  // 현재 동아리 정보
  const [club, setClub] = useState(null);

  // 페이지 로딩 상태
  const [isLoading, setIsLoading] = useState(true);

  /*
    현재 선택된 만족도 조사 탭
    schedule: 일정 만족도
    fee: 회비 사용 만족도
  */
  const [activeTab, setActiveTab] = useState('schedule');

  // 일정 만족도 조사 항목
  const [scheduleItems, setScheduleItems] = useState([]);

  // 회비 사용 만족도 조사 항목
  const [feeItems, setFeeItems] = useState([]);

  // 사용자가 선택한 만족도 답변 저장 (key: 항목 id, value: 만족도 점수)
  const [answers, setAnswers] = useState({});

  // 제출 중인지 확인하는 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 임시 저장, 제출 오류 등 안내 메시지
  const [message, setMessage] = useState('');

  // 운영진용 조사 항목 관리 모달 상태
  const [isSurveyManageOpen, setIsSurveyManageOpen] = useState(false);

  // 관리 모달 안에서 현재 선택한 내역 종류 (schedule: 일정 내역, fee: 회비 사용 내역)
  const [manageType, setManageType] = useState(null);

  //일정 내역 후보, 아직 일정 페이지/API가 없으므로 지금은 빈 배열로 둠
  const [selectableScheduleItems, setSelectableScheduleItems] = useState([]);

  // 회비 지출 내역 후보, getFeeTransactions API에서 가져온 지출 내역만 저장
  const [selectableFeeItems, setSelectableFeeItems] = useState([]);

  // 체크된 일정/회비 항목 id
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState([]);

  //관리 모달에서 내역 불러오는 중인지 확인
  const [isManageLoading, setIsManageLoading] = useState(false);

  // 현재 월의 만족도 조사 기간 계산 (화면 상단 조사 기간 카드에서 사용)
  const surveyPeriod = getCurrentBiweeklySurveyPeriod();

  /*
    페이지가 처음 열릴 때 실행됨.
    1. 동아리 기본 정보 조회
    2. 만족도 조사 데이터 조회 시도
    3. 만족도 조사 API가 아직 없어도 기본 데이터로 화면 표시
  */
  useEffect(() => {
    const fetchPageData = async () => {
      try {
        // 동아리 상세 정보 가져오기
        const clubData = await getClub(clubId);
        setClub(clubData);

        /*
          만족도 조사 API 조회
          아직 백엔드가 완성되지 않았으면 catch로 넘어가고,
          위에서 선언한 기본 데이터가 화면에 표시됨.
        */
        try {
          const surveyData = await getMonthlySurvey(clubId);

          // API에서 일정 조사 항목이 오면 기존 기본 데이터를 교체함
          if (surveyData.schedule_items) {
            setScheduleItems(surveyData.schedule_items);
          }

          // API에서 회비 조사 항목이 오면 기존 기본 데이터를 교체함
          if (surveyData.fee_items) {
            setFeeItems(surveyData.fee_items);
          }

          // 이미 임시 저장된 답변이 있으면 화면에 반영함
          if (surveyData.answers) {
            setAnswers(surveyData.answers);
          }
        } catch (surveyError) {
          /*
            만족도 조사 API가 아직 연결되지 않았을 경우
            페이지 전체가 깨지지 않도록 콘솔에만 표시함.
          */
          console.log('만족도 조사 API 연결 전이라 기본 데이터를 표시합니다.', surveyError);
        }
      } catch (error) {
        console.error('동아리 정보를 불러오지 못했습니다.', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageData();
  }, [clubId]);

  /*
    현재 선택된 탭에 따라 화면에 보여줄 항목을 결정함.
    일정 탭이면 scheduleItems,
    회비 탭이면 feeItems를 보여줌.
  */
  const currentItems = activeTab === 'schedule' ? scheduleItems : feeItems;

  // 전체 조사 항목 개수
  const totalCount = scheduleItems.length + feeItems.length;

  // 사용자가 평가한 항목 개수
  const answeredCount = Object.keys(answers).length;

  /*
    조사 진행률 계산
    useMemo를 사용해서 answeredCount 또는 totalCount가 바뀔 때만 다시 계산함.
  */
  const progressPercent = useMemo(() => {
    if (totalCount === 0) return 0;

    return Math.round((answeredCount / totalCount) * 100);
  }, [answeredCount, totalCount]);

  // 모든 항목에 응답했는지 확인
  const isAllAnswered = totalCount > 0 && answeredCount === totalCount;

  // 로그아웃 버튼 클릭 시 실행
  const handleLogout = () => {
    localStorage.removeItem('loginUser');
    navigate('/login');
  };

  /*
    별점 버튼 클릭 시 실행
    itemId에 해당하는 항목의 점수를 answers에 저장함.
  */
  const handleRatingClick = (itemId, score) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: score,
    }));
  };

  /*
    임시 저장 버튼 클릭 시 실행
    현재 선택한 답변을 백엔드로 전송함.
  */
  const handleSaveDraft = async () => {
    setMessage('');

    try {
      await saveMonthlySurveyDraft(clubId, {
        answers,
      });

      setMessage('임시 저장되었습니다.');
    } catch (error) {
      console.error(error);
      setMessage(error?.message || '임시 저장에 실패했습니다.');
    }
  };

  /*
    만족도 조사 최종 제출 버튼 클릭 시 실행
    모든 항목을 평가해야 제출 가능하도록 처리함.
  */
  const handleSubmitSurvey = async () => {
    if (!isAllAnswered) {
      setMessage('모든 항목을 평가해야 제출할 수 있습니다.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      await submitMonthlySurvey(clubId, {
        schedule_items: scheduleItems,
        fee_items: feeItems,
        answers,
      });

      alert('만족도 조사가 제출되었습니다.');
    } catch (error) {
      console.error(error);
      setMessage(error?.message || '만족도 조사 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
  (관리 버튼/체크/저장 함수)
  날짜 값을 비교 가능한 시간값으로 바꿔주는 함수
  created_at, date 등 어떤 값이 들어와도 최대한 정렬 가능하게 처리
  */
  const getTimeValue = (item) => {
    const dateValue =
      item.created_at ||
      item.createdAt ||
      item.date ||
      item.used_at ||
      item.transaction_date;

    const time = new Date(dateValue).getTime();

    return Number.isNaN(time) ? 0 : time;
  };

  /*
    회비 내역의 날짜를 화면에 보여줄 문자열로 변환
  */
  const getFeeDateText = (item) => {
    return (
      item.date ||
      item.used_at ||
      item.transaction_date ||
      item.created_at ||
      item.createdAt ||
      '-'
    );
  };

  /*
    회비 내역의 제목을 화면에 보여줄 문자열로 변환
  */
  const getFeeTitleText = (item) => {
    return (
      item.title ||
      item.content ||
      item.category ||
      item.memo ||
      item.description ||
      '회비 사용 내역'
    );
  };

  /*
    회비 내역의 금액을 숫자로 변환
  */
  const getFeeAmountValue = (item) => {
    return Number(item.amount || item.price || item.cost || 0);
  };

  // 회비 내역의 구분을 화면에 보여줄 문자열로 변환
	const getFeeTypeText = (item) => {
		const typeValue =
			item.type ||
			item.transaction_type ||
			item.transactionType ||
			item.kind;

		if (typeValue === 'INCOME' || typeValue === '수입') return '수입';
		if (typeValue === 'EXPENSE' || typeValue === '지출') return '지출';

		return typeValue || '-';
	};

  // 회비 내역의 카테고리를 화면에 보여줄 문자열로 변환
	const getFeeCategoryText = (item) => {
		return item.category || item.category_name || '-';
	};

  // 회비 내역의 금액을 수입/지출 부호까지 붙여서 표시
	const getFeeAmountText = (item) => {
		const amount = Math.abs(getFeeAmountValue(item)).toLocaleString();
		const typeText = getFeeTypeText(item);

		if (typeText === '수입') return `+${amount}원`;
		if (typeText === '지출') return `-${amount}원`;

		return `${amount}원`;
	};

  // 수입/지출에 따라 금액 색상 클래스 구분
	const getFeeAmountClassName = (item) => {
		const typeText = getFeeTypeText(item);

		if (typeText === '수입') return 'survey-manage-fee-amount income';
		if (typeText === '지출') return 'survey-manage-fee-amount expense';

		return 'survey-manage-fee-amount';
	};

  // 조사 항목 관리 버튼 클릭 시 실행
  const handleOpenSurveyManage = () => {
    setIsSurveyManageOpen(true);
    setManageType(null);
  };

  /*
    일정 내역 버튼 클릭 시 실행
    지금은 일정 API가 없으므로 안내만 표시
  */
  const handleOpenScheduleSelect = () => {
    setManageType('schedule');

    /*
      나중에 일정 API가 생기면 여기서 일정 목록을 불러오면 됨.
      예:
      const data = await getSchedules(clubId);
      setSelectableScheduleItems(data.results || data);
    */
    setSelectableScheduleItems([]);
  };

  /*
     회비 사용 내역 버튼 클릭 시 실행
    전체 회비 내역 중 지출 내역만 최근 등록순으로 가져옴
  */
  const handleOpenFeeSelect = async () => {
     setManageType('fee');
     setIsManageLoading(true);

    try {
      const data = await getFeeTransactions(clubId, { limit: 'all' });

      const transactionList = Array.isArray(data)
        ? data
        : data.results || [];

      // 수입/지출을 모두 포함해서 최근 등록순으로 정렬
      const sortedTransactionList = transactionList
        .sort((a, b) => getTimeValue(b) - getTimeValue(a));

      setSelectableFeeItems(sortedTransactionList);
    } catch (error) {
      console.error('회비 사용 내역을 불러오지 못했습니다.', error);
      alert('회비 사용 내역을 불러오지 못했습니다.');
    } finally {
        setIsManageLoading(false);
    }
  };

  /*
    일정 체크박스 선택/해제
  */
  const handleToggleScheduleItem = (itemId) => {
    setSelectedScheduleIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  /*
    회비 체크박스 선택/해제
  */
  const handleToggleFeeItem = (itemId) => {
    setSelectedFeeIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  // 체크된 항목을 만족도 조사 항목으로 반영
	const handleApplySurveyItems = async () => {
		let nextScheduleItems = scheduleItems;
		let nextFeeItems = feeItems;

		if (manageType === 'schedule') {
			const selectedItems = selectableScheduleItems
				.filter((item) => selectedScheduleIds.includes(item.id))
				.sort((a, b) => getTimeValue(a) - getTimeValue(b))
        .map((item) => ({
					id: `schedule-${item.id}`,
					originalId: item.id,
					title: item.title || item.name,
					date: item.date || item.start_at || '-',

					participants:
						item.participants ??
						item.response_count ??
						item.responseCount ??
						item.answered_count ??
						item.answeredCount ??
						0,

					totalMembers:
						item.totalMembers ??
						item.total_members ??
						item.totalMemberCount ??
						item.member_count ??
						item.memberCount ??
						0,
				}));

			nextScheduleItems = selectedItems;
			setScheduleItems(selectedItems);
			setActiveTab('schedule');
		}

		if (manageType === 'fee') {
			const selectedItems = selectableFeeItems
				.filter((item) => selectedFeeIds.includes(item.id))
				.sort((a, b) => getTimeValue(a) - getTimeValue(b))
				.map((item) => ({
					id: `fee-${item.id}`,
					originalId: item.id,
					title: getFeeTitleText(item),
					date: getFeeDateText(item),
					type: getFeeTypeText(item),
					category: getFeeCategoryText(item),
					amount: Math.abs(getFeeAmountValue(item)),

					participants:
						item.participants ??
						item.response_count ??
						item.responseCount ??
						item.answered_count ??
						item.answeredCount ??
						0,

					totalMembers:
						item.totalMembers ??
						item.total_members ??
						item.totalMemberCount ??
						item.member_count ??
						item.memberCount ??
						0,
				}));

			nextFeeItems = selectedItems;
			setFeeItems(selectedItems);
			setActiveTab('fee');
		}

		try {
			await saveSurveyItems(clubId, {
				schedule_items: nextScheduleItems,
				fee_items: nextFeeItems,
			});

			setIsSurveyManageOpen(false);
			setMessage('조사 항목이 저장되었습니다.');
		} catch (error) {
			console.error(error);
			setMessage(error?.message || '조사 항목 저장에 실패했습니다.');
		}
	};

  // 일정별 참여율 계산 함수 : articipants / totalMembers * 100
  const getParticipationRate = (item) => {
    if (!item.totalMembers) return '-';

    return `${Math.round((item.participants / item.totalMembers) * 100)}%`;
  };

  /*
  참여율 값에 따라 배지 색상 클래스를 반환하는 함수

  60% 이상: 파란색
  40% 이상 60% 미만: 주황색
  40% 미만: 빨간색
*/
const getParticipationBadgeClass = (item) => {
  if (!item.totalMembers) {
    return 'survey-participation-badge';
  }

  const rate = Math.round((item.participants / item.totalMembers) * 100);

  if (rate >= 60) {
    return 'survey-participation-badge high';
  }

  if (rate >= 40) {
    return 'survey-participation-badge middle';
  }

  return 'survey-participation-badge low';
};

  // 로딩 중일 때 표시할 화면
  if (isLoading) {
    return (
      <div className="club-dashboard-page">
        <div className="club-survey-loading">
          만족도 조사 페이지를 불러오는 중입니다...
        </div>
      </div>
    );
  }

 return (
  <div className="club-dashboard-page">
    <div className="dashboard-fixed-canvas">
      {/* 왼쪽 사이드바 영역 */}
      <aside className="dashboard-sidebar">
        {/* 사이드바 상단 로고 */}
        <div className="sidebar-logo">
          <Link to="/main" className="sidebar-clubflow-logo">
            <span className="sidebar-logo-cf">CF</span>
            <span className="sidebar-logo-text">ClubFlow</span>
          </Link>
        </div>

        {/* 사이드바 메뉴 */}
        <nav className="sidebar-menu">
          <Link to={`/club/${clubId}/dashboard`} className="sidebar-link">
            <LayoutDashboard size={19} />
            대시보드
          </Link>

          {/* 동아리 정보 메뉴 그룹 */}
          <div className="sidebar-menu-group">
            <Link
              to={`/club/${clubId}/info`}
              className="sidebar-link sidebar-parent-link"
            >
              <FileText size={19} />
              동아리 정보
            </Link>

            {/* 운영진에게만 동아리 정보 수정 메뉴 표시 */}
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

          <Link to={`/club/${clubId}/schedule`} className="sidebar-link">
            <CalendarDays size={19} />
            일정 관리 / 공지
          </Link>

          {/* 현재 페이지이므로 active 클래스 적용 */}
          <Link to={`/club/${clubId}/survey`} className="sidebar-link active">
            <MessageCircleHeart size={19} />
            만족도 조사
          </Link>

          <Link to={`/club/${clubId}/health`} className="sidebar-link">
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

      {/* 오른쪽 메인 영역 */}
      <main className="dashboard-main club-survey-main">
        <div className="dashboard-frame club-survey-frame">
          {/* 브레드크럼 */}
          <nav className="dashboard-breadcrumb">
            <Link to="/main">플랫폼 메인</Link>
            <span>›</span>
            <Link to="/main">내 동아리</Link>
            <span>›</span>
            <span>{club?.name || '동아리'}</span>
            <span>›</span>
            <span className="breadcrumb-current">만족도 조사</span>
          </nav>

          {/* 상단 헤더 */}
          <header className="dashboard-header">
            <div>
              <p className="dashboard-label">Monthly Survey</p>
              <h1>만족도 조사</h1>
              <p className="dashboard-desc">
                이번 달 활동과 회비 사용에 대한 만족도를 평가해주세요.
              </p>
            </div>

            {/* 오른쪽 사용자 정보 영역 */}
            <div className="dashboard-user-box survey-header-actions">
              {/* 운영진에게만 보이는 조사 항목 관리 버튼 */}
              {isClubManager && (
                <button
                  type="button"
                  className="survey-manage-button"
                  onClick={handleOpenSurveyManage}
                >
                  조사 항목 관리
                </button>
              )}

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

          {/* 만족도 조사 기간 카드 */}
          <section className="survey-period-card">
            <div className="survey-period-icon">
              <CalendarDays size={23} />
            </div>

            <div>
              <strong>
                {surveyPeriod.month}월 {surveyPeriod.roundLabel} 만족도 조사 기간
              </strong>
              <p>
                {formatSurveyDate(surveyPeriod.startDate)} ~{' '}
                {formatSurveyDate(surveyPeriod.endDate)}
                {' '}· 남은 기간: {surveyPeriod.remainingDays}일
              </p>
            </div>

            <span>만족도 조사는 2주에 한 번씩 진행됩니다.</span>
          </section>

          {/* 만족도 조사 본문 */}
          <section className="club-survey-content">
            {/* 왼쪽: 만족도 조사 입력 영역 */}
            <div className="survey-left-area">
              {/* 조사 종류 탭 */}
              <div className="survey-tab-row">
                <button
                  type="button"
                  className={activeTab === 'schedule' ? 'survey-tab active' : 'survey-tab'}
                  onClick={() => setActiveTab('schedule')}
                >
                  <CalendarDays size={18} />
                  일정 만족도
                </button>

                <button
                  type="button"
                  className={activeTab === 'fee' ? 'survey-tab active' : 'survey-tab'}
                  onClick={() => setActiveTab('fee')}
                >
                  <CreditCard size={18} />
                  회비 사용 만족도
                </button>
              </div>

              {/* 조사 항목 패널 */}
              <div className="survey-panel">
                {/* 안내 박스 */}
                <div className="survey-guide-box">
                  <Info size={22} />

                  <div>
                    <strong>
                      {activeTab === 'schedule'
                        ? '일정 만족도 조사 안내'
                        : '회비 사용 만족도 조사 안내'}
                    </strong>

                    <p>
                      {activeTab === 'schedule'
                        ? '이번 달에 진행된 동아리 일정을 확인하고, 각 일정에 대한 만족도를 평가해주세요.'
                        : '이번 달 회비 사용 내역을 확인하고, 각 지출에 대한 만족도를 평가해주세요.'}
                    </p>
                  </div>
                </div>

                {/* 조사 항목 목록 */}
                <div className="survey-item-list">
                  {currentItems.length === 0 ? (
                    <div className="survey-empty-box">
                      <p>
                        등록된 조사 항목이 없습니다.
                        <br />
                        운영진이 조사 항목 관리에서 항목을 선택하면 이곳에 표시됩니다.
                      </p>
                    </div>
                  ) : (
                    currentItems.map((item) => (
                      <article className="survey-item-card" key={item.id}>
                        {/* 항목 정보 영역 */}
                        <div className="survey-item-info">
                          <div className="survey-item-icon">
                            {activeTab === 'schedule' ? (
                              <CalendarDays size={26} />
                            ) : (
                              <CreditCard size={26} />
                            )}
                          </div>

                          <div className="survey-item-text">
                            <h3>{item.title}</h3>

                            {activeTab === 'schedule' ? (
                              <>
                                <p>{item.date}</p>
                                <span>
                                  참여 {item.participants}명 / 전체 {item.totalMembers}명
                                </span>
                              </>
                            ) : (
                              <>
																<p>
																	{item.date} · {item.type || '-'} · {item.category || '-'}
																</p>

																<span>
																	{item.type === '수입' ? '+' : item.type === '지출' ? '-' : ''}
																	{item.amount?.toLocaleString()}원
																</span>
                              </>
                            )}
                          </div>

                          {/* 오른쪽 참여율 배지 */}
                            <em className={getParticipationBadgeClass(item)}>
                              참여율 {getParticipationRate(item)}
                            </em>
                        </div>

                        {/* 만족도 평가 영역 */}
                        <div className="survey-rating-area">
                          <strong>만족도 평가</strong>

                          <div className="rating-button-row">
                            {ratingLabels.map((label, index) => {
                              const score = index + 1;
                              const isSelected = answers[item.id] === score;

                              return (
                                <button
                                  type="button"
                                  key={label}
                                  className={
                                    isSelected
                                      ? 'rating-button selected'
                                      : 'rating-button'
                                  }
                                  onClick={() => handleRatingClick(item.id, score)}
                                >
                                  <Star size={22} />
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                {/* 안내 메시지 */}
                {message && <p className="survey-message">{message}</p>}

                {/* 최종 제출 버튼 */}
                <button
                  type="button"
                  className="survey-submit-button"
                  onClick={handleSubmitSurvey}
                  disabled={isSubmitting}
                >
                  <Check size={18} />
                  {isSubmitting ? '제출 중...' : '만족도 조사 제출하기'}
                </button>
              </div>
            </div>

            {/* 오른쪽: 진행 현황 / 안내사항 / 평가 기준 */}
            <aside className="survey-right-area">
              {/* 조사 진행 현황 카드 */}
              <section className="survey-status-card">
                <h2>조사 진행 현황</h2>

                <div className="survey-progress-circle">
                  <div
                    className="survey-progress-fill"
                    style={{
                      background: `conic-gradient(#4f63e7 ${progressPercent}%, #e5e7eb 0)`,
                    }}
                  >
                    <div>
                      <strong>
                        {answeredCount}/{totalCount}
                      </strong>
                      <span>완료</span>
                    </div>
                  </div>
                </div>

                <p>
                  전체 {totalCount}개 항목 중<br />
                  {answeredCount}개 완료했습니다.
                </p>

                <button type="button" onClick={handleSaveDraft}>
                  임시 저장
                </button>
              </section>

              {/* 안내사항 카드 */}
              <section className="survey-notice-card">
                <h2>안내사항</h2>
                <p>모든 항목을 평가해야 제출할 수 있습니다.</p>
                <p>제출 후에는 수정이 불가합니다.</p>
                <p>솔직한 의견은 동아리 운영 개선에 도움이 됩니다.</p>
              </section>

              {/* 만족도 평가 기준 카드 */}
              <section className="survey-standard-card">
                <h2>만족도 평가 기준</h2>

                <div className="standard-list">
                  {ratingLabels.map((label, index) => (
                    <div
                      className={`standard-item score-${index + 1}`}
                      key={label}
                    >
                      <Star size={16} />
                      <strong>{label}</strong>

                      <span>
                        {index === 0 && '매우 만족스럽지 않습니다.'}
                        {index === 1 && '만족스럽지 않습니다.'}
                        {index === 2 && '보통입니다.'}
                        {index === 3 && '대체로 만족합니다.'}
                        {index === 4 && '매우 만족스럽습니다.'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>

      {/* 운영진용 조사 항목 관리 모달 */}
      {isSurveyManageOpen && (
        <div className="survey-manage-modal-backdrop">
          <section className="survey-manage-modal">
            <div className="survey-manage-modal-header">
              <div>
                <h2>조사 항목 관리</h2>
                <p>
                  일정 내역 또는 회비 사용 내역을 선택해 만족도 조사 항목으로 등록합니다.
                </p>
              </div>

              <button
                type="button"
                className="survey-manage-close-button"
                onClick={() => setIsSurveyManageOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* 일정 내역 / 회비 사용 내역 선택 버튼 */}
            <div className="survey-manage-type-row">
              <button
                type="button"
                className={
                  manageType === 'schedule'
                    ? 'survey-manage-type-button active'
                    : 'survey-manage-type-button'
                }
                onClick={handleOpenScheduleSelect}
              >
                <CalendarDays size={18} />
                일정 내역
              </button>

              <button
                type="button"
                className={
                  manageType === 'fee'
                    ? 'survey-manage-type-button active'
                    : 'survey-manage-type-button'
                }
                onClick={handleOpenFeeSelect}
              >
                <CreditCard size={18} />
                회비 사용 내역
              </button>
            </div>

            {!manageType && (
              <div className="survey-manage-empty-box">
                <p>조사 항목으로 등록할 내역 종류를 선택해주세요.</p>
              </div>
            )}

            {/* 일정 내역 선택 영역 */}
            {manageType === 'schedule' && (
              <div className="survey-manage-list-box">
                {selectableScheduleItems.length === 0 ? (
                  <div className="survey-manage-empty-box">
                    <p>
                      아직 일정 관리 페이지/API가 없어서 불러올 일정 내역이 없습니다.
                      <br />
                      나중에 일정 API가 완성되면 이 영역에 최근 등록순으로 표시하면 됩니다.
                    </p>
                  </div>
                ) : (
                  selectableScheduleItems.map((item) => (
                    <label className="survey-manage-check-row" key={item.id}>
                      <input
                        type="checkbox"
                        checked={selectedScheduleIds.includes(item.id)}
                        onChange={() => handleToggleScheduleItem(item.id)}
                      />

                      <div>
                        <strong>{item.title || item.name}</strong>
                        <p>{item.date || item.start_at || '-'}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}

						{/* 회비 사용 내역 선택 영역 */}
						{manageType === 'fee' && (
							<div className="survey-manage-list-box">
								{isManageLoading ? (
									<div className="survey-manage-empty-box">
										<p>회비 사용 내역을 불러오는 중입니다...</p>
									</div>
								) : selectableFeeItems.length === 0 ? (
									<div className="survey-manage-empty-box">
										<p>등록된 회비 사용 내역이 없습니다.</p>
									</div>
								) : (
									selectableFeeItems.map((item) => (
										<label className="survey-manage-check-row fee" key={item.id}>
											{/* 선택 체크박스 */}
											<input
												type="checkbox"
												checked={selectedFeeIds.includes(item.id)}
												onChange={() => handleToggleFeeItem(item.id)}
											/>

											{/* 날짜 */}
											<span className="survey-manage-fee-date">
												{getFeeDateText(item)}
											</span>

											{/* 구분: 수입 / 지출 */}
											<em
												className={
													getFeeTypeText(item) === '수입'
														? 'survey-manage-fee-type income'
														: 'survey-manage-fee-type expense'
												}
											>
												{getFeeTypeText(item)}
											</em>

											{/* 내용 */}
											<strong className="survey-manage-fee-title">
												{getFeeTitleText(item)}
											</strong>

											{/* 카테고리 */}
											<span className="survey-manage-fee-category">
												{getFeeCategoryText(item)}
											</span>

											{/* 금액 */}
											<span className={getFeeAmountClassName(item)}>
												{getFeeAmountText(item)}
											</span>
										</label>
									))
								)}
							</div>
						)}

						<div className="survey-manage-modal-actions">
							<button
								type="button"
								className="survey-manage-cancel-button"
								onClick={() => setIsSurveyManageOpen(false)}
							>
								취소
							</button>

							<button
								type="button"
								className="survey-manage-apply-button"
								onClick={handleApplySurveyItems}
								disabled={!manageType}
							>
								선택 항목 반영하기
							</button>
						</div>
          </section>
        </div>
      )}
    </div>
  </div>
);
}

export default ClubSurveyPage;