import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClub } from '../../api/clubs.js';
import { getFeeTransactions } from '../../api/fees.js';
import { fetchEvents, fetchMyEventRole } from '../../api/events.js';

import {
	getMonthlySurvey,
	saveSurveyItems,
	saveMonthlySurveyDraft,
	submitMonthlySurvey,
	getSurveyResults,
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
	BarChart3,
	TrendingDown,
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

	const [surveyRole, setSurveyRole] = useState(null);
	const [canManageSurvey, setCanManageSurvey] = useState(false);

	useEffect(() => {
		const loadSurveyRole = async () => {
			if (!clubId) return;

			try {
				const roleData = await fetchMyEventRole(clubId);

				setCanManageSurvey(Boolean(roleData.can_manage_events));
			} catch (error) {
				console.error('만족도 조사 관리 권한을 확인하지 못했습니다.', error);
				setCanManageSurvey(false);
			}
		};

		loadSurveyRole();
	}, [clubId]);
	
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

	// 만족도 항목이 수정된 날짜
	const [feeUpdatedDate, setFeeUpdatedDate] = useState('');
	const [scheduleUpdatedDate, setScheduleUpdatedDate] = useState('');

	// 현재 사용자가 이미 제출했는지
	const [hasSubmitted, setHasSubmitted] = useState(false);

	// 새 항목 추가로 인해 재제출이 필요한지
	const [needsResubmit, setNeedsResubmit] = useState(false);

	// 운영진용 조사 항목 관리 모달 상태
	const [isSurveyManageOpen, setIsSurveyManageOpen] = useState(false);

	// 운영진용 결과 분석 모달 상태
	const [isSurveyResultOpen, setIsSurveyResultOpen] = useState(false);
	const [surveyResultData, setSurveyResultData] = useState(null);
	const [isSurveyResultLoading, setIsSurveyResultLoading] = useState(false);
	const [surveyResultError, setSurveyResultError] = useState('');
	const [resultActiveTab, setResultActiveTab] = useState('schedule');

	// 관리 모달 안에서 현재 선택한 내역 종류 (schedule: 일정 내역, fee: 회비 사용 내역)
	const [manageType, setManageType] = useState(null);

	//일정 내역 후보, 아직 일정 페이지/API가 없으므로 지금은 빈 배열로 둠
	const [selectableScheduleItems, setSelectableScheduleItems] = useState([]);

	// 회비 지출 내역 후보, getFeeTransactions API에서 가져온 지출 내역만 저장
	const [selectableFeeItems, setSelectableFeeItems] = useState([]);

	// 체크된 일정/회비 항목 id
	const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
	const [selectedFeeIds, setSelectedFeeIds] = useState([]);
	
	// 이번 수정에서 새로 추가된 조사 항목 id만 저장
	const [newSurveyItemIds, setNewSurveyItemIds] = useState([]);

	//관리 모달에서 내역 불러오는 중인지 확인
	const [isManageLoading, setIsManageLoading] = useState(false);

	// 현재 월의 만족도 조사 기간 계산 (화면 상단 조사 기간 카드에서 사용)
	const surveyPeriod = getCurrentBiweeklySurveyPeriod();

	const mergeParticipationData = async (baseScheduleItems, baseFeeItems) => {
		try {
			const resultData = await getSurveyResults(clubId);

			const totalMemberCount = resultData?.summary?.total_member_count ?? 0;

			const scheduleResultMap = new Map(
				(resultData?.schedule_results || []).map((item) => [item.id, item])
			);

			const feeResultMap = new Map(
				(resultData?.fee_results || []).map((item) => [item.id, item])
			);

			const mergedScheduleItems = (baseScheduleItems || []).map((item) => {
				const resultItem = scheduleResultMap.get(item.id);

				return {
					...item,
					participants: resultItem?.response_count ?? item.participants ?? 0,
					totalMembers: totalMemberCount,
				};
			});

			const mergedFeeItems = (baseFeeItems || []).map((item) => {
				const resultItem = feeResultMap.get(item.id);

				return {
					...item,
					participants: resultItem?.response_count ?? item.participants ?? 0,
					totalMembers: totalMemberCount,
				};
			});

			return {
				scheduleItems: mergedScheduleItems,
				feeItems: mergedFeeItems,
			};
		} catch (error) {
			console.error('참여율 데이터를 합치는 중 오류가 발생했습니다.', error);

			return {
				scheduleItems: baseScheduleItems || [],
				feeItems: baseFeeItems || [],
			};
		}
	};

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

				try {
					const surveyData = await getMonthlySurvey(clubId);

					const mergedData = await mergeParticipationData(
						surveyData.schedule_items || [],
						surveyData.fee_items || []
					);

					setScheduleItems(mergedData.scheduleItems);
					setFeeItems(mergedData.feeItems);

					setSelectedScheduleIds(
						mergedData.scheduleItems
							.map((item) => item.originalId || item.original_id)
							.filter(Boolean)
					);

					setSelectedFeeIds(
						mergedData.feeItems
							.map((item) => item.originalId || item.original_id)
							.filter(Boolean)
					);

					if (surveyData.answers) {
						setAnswers(surveyData.answers);
					}

					setFeeUpdatedDate(surveyData.fee_updated_date || '');
					setHasSubmitted(surveyData.has_submitted || false);
					setNeedsResubmit(surveyData.needs_resubmit || false);
					setNewSurveyItemIds([]);

				} catch (surveyError) {
					console.error('만족도 조사 데이터를 불러오지 못했습니다.', surveyError);
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
	const allSurveyItemIds = useMemo(() => {
		return [...scheduleItems, ...feeItems].map((item) => item.id);
	}, [scheduleItems, feeItems]);

	const totalCount = allSurveyItemIds.length;

	// 사용자가 평가한 항목 개수
	const answeredCount = allSurveyItemIds.filter((itemId) => {
		return answers[itemId];
	}).length;

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
			const data = await saveMonthlySurveyDraft(clubId, {
				answers,
			});

			setMessage(data.message || '임시 저장되었습니다.');
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
		if (hasSubmitted && !needsResubmit) {
			setMessage('이미 제출한 만족도 조사입니다.');
			return;
		}

		if (!isAllAnswered) {
			setMessage('모든 항목을 평가해야 제출할 수 있습니다.');
			return;
		}

		setIsSubmitting(true);
		setMessage('');

		try {
			const data = await submitMonthlySurvey(clubId, {
				answers,
			});

			setHasSubmitted(data.has_submitted || true);
			setNeedsResubmit(data.needs_resubmit || false);
			setMessage(data.message || '만족도 조사가 제출되었습니다.');

			const refreshedSurveyData = await getMonthlySurvey(clubId);

			const mergedData = await mergeParticipationData(
				refreshedSurveyData.schedule_items || [],
				refreshedSurveyData.fee_items || []
			);

			setScheduleItems(mergedData.scheduleItems);
			setFeeItems(mergedData.feeItems);
			setAnswers(refreshedSurveyData.answers || {});
			setHasSubmitted(refreshedSurveyData.has_submitted || false);
			setNeedsResubmit(refreshedSurveyData.needs_resubmit || false);

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

	// 일정 날짜를 YYYY-MM-DD 형식으로 바꾸는 함수
	const getScheduleDateText = (dateValue) => {
		if (!dateValue) return '-';

		const date = new Date(dateValue);

		if (Number.isNaN(date.getTime())) {
			return String(dateValue).slice(0, 10);
		}

		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}`;
	};

	// 일정 시작일과 종료일을 "시작일 ~ 종료일" 형태로 만드는 함수
	const getSchedulePeriodText = (item) => {
		const startDate = getScheduleDateText(
			item.start_at ||
			item.startAt ||
			item.start_date ||
			item.startDate ||
			item.date
		);

		const endDate = getScheduleDateText(
			item.end_at ||
			item.endAt ||
			item.end_date ||
			item.endDate
		);

		if (!endDate || endDate === '-') {
			return startDate;
		}

		return `${startDate} ~ ${endDate}`;
	};

	// 이미 조사 항목으로 저장된 일정의 날짜를 화면 표시용으로 정리하는 함수
	const getSurveyScheduleDateText = (item) => {
		if (!item) return '-';

		if (item.startDate || item.endDate) {
			if (item.endDate && item.endDate !== '-') {
				return `${item.startDate} ~ ${item.endDate}`;
			}

			return item.startDate || '-';
		}

		if (item.date && String(item.date).includes('~')) {
			return item.date;
		}

		if (item.date) {
			return getScheduleDateText(item.date);
		}

		return getSchedulePeriodText(item);
	};

	const getScheduleTypeText = (item) => {
		const typeValue =
			item.event_type_display ||
			item.eventTypeDisplay ||
			item.event_type ||
			item.type;

		if (typeValue === 'regular') return '정기 모임';
		if (typeValue === 'activity') return '행사';
		if (typeValue === 'recruitment') return '모집';
		if (typeValue === 'interview') return '면접';
		if (typeValue === 'project') return '프로젝트';
		if (typeValue === 'etc') return '기타';

		return typeValue || '일정';
	};

	const getScheduleStatusText = (item) => {
		const statusValue =
			item.status_display ||
			item.statusDisplay ||
			item.status;

		if (statusValue === 'scheduled') return '예정';
		if (statusValue === 'completed') return '완료';
		if (statusValue === 'canceled') return '취소';

		return statusValue || '-';
	};

	// 전체 인원 가져오는 함수
	const getTotalMemberCount = () => {
		return (
			club?.member_count ??
			club?.memberCount ??
			club?.current_members ??
			club?.currentMembers ??
			club?.members_count ??
			0
		);
	};

	const getScheduleMemberCountText = (item) => {
		const maxCount =
			item.max_participants ??
			item.maxParticipants ??
			null;

		if (maxCount) {
			return `${maxCount}명`;
		}

		return '-';
	};

	// 회비 내역의 날짜를 화면에 보여줄 문자열로 변환
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

	// 회비 내역의 제목을 화면에 보여줄 문자열로 변환
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

	// 회비 내역의 금액을 숫자로 변환
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

	  const getSatisfactionLevel = (score) => {
	const numericScore = Number(score);

	if (!numericScore) return '미응답';
	if (numericScore >= 4.5) return '매우높음';
	if (numericScore >= 3.5) return '높음';
	if (numericScore >= 2.5) return '보통';
	if (numericScore >= 1.5) return '낮음';
	return '매우낮음';
  };

  const getSatisfactionLevelClass = (score) => {
	const numericScore = Number(score);

	if (!numericScore) return 'empty';
	if (numericScore >= 4.5) return 'very-high';
	if (numericScore >= 3.5) return 'high';
	if (numericScore >= 2.5) return 'normal';
	if (numericScore >= 1.5) return 'low';
	return 'very-low';
  };

	// 결과 분석 버튼 실행시 만족도 조사 결과 조회 API를 호출해서 데이터를 가져오고, 결과 분석 모달을 열어줌
  const handleOpenSurveyResult = async () => {
	setIsSurveyResultOpen(true);
	setResultActiveTab('schedule');
	setSurveyResultError('');
	setIsSurveyResultLoading(true);

	try {
	  const data = await getSurveyResults(clubId);
	  setSurveyResultData(data);
	} catch (error) {
	  console.error('만족도 조사 결과를 불러오지 못했습니다.', error);
	  setSurveyResultError(
		error?.message || '만족도 조사 결과를 불러오지 못했습니다.'
	  );
	} finally {
	  setIsSurveyResultLoading(false);
	}
  };

	// 그래프 표시에 사용할 전체 응답 분포 계산 함수
	const getOverallDistribution = () => {
	const distribution = {
	  5: 0,
	  4: 0,
	  3: 0,
	  2: 0,
	  1: 0,
	};

	const allResults = [
	  ...(surveyResultData?.schedule_results || []),
	  ...(surveyResultData?.fee_results || []),
	];

	allResults.forEach((item) => {
	  [1, 2, 3, 4, 5].forEach((score) => {
		distribution[score] += item.distribution?.[score] || item.distribution?.[String(score)] || 0;
	  });
	});

	return distribution;
  };
	/*	일정 내역 버튼 클릭 시 실행 */
	const handleOpenScheduleSelect = async () => {
		setManageType('schedule');

		setSelectedScheduleIds(
			scheduleItems
				.map((item) =>
					String(item.originalId || item.original_id || item.id).replace(
						'schedule-',
						''
					)
				)
				.filter(Boolean)
		);

		setIsManageLoading(true);

		try {
			const data = await fetchEvents(clubId, {
				status: '',
				eventType: '',
				search: '',
			});

			const eventList = Array.isArray(data)
				? data
				: data.results || [];

			const sortedEventList = eventList.sort(
				(a, b) => getTimeValue(b) - getTimeValue(a)
			);

			setSelectableScheduleItems(sortedEventList);
		} catch (error) {
			console.error('일정 내역을 불러오지 못했습니다.', error);
			alert('일정 내역을 불러오지 못했습니다.');
		} finally {
			setIsManageLoading(false);
		}
	};
	
	/*
		 회비 사용 내역 버튼 클릭 시 실행
		전체 회비 내역 중 지출 내역만 최근 등록순으로 가져옴
	*/
	const handleOpenFeeSelect = async () => {
		setManageType('fee');

		// 이미 조사 항목으로 등록된 회비 내역은 체크 상태로 유지
		setSelectedFeeIds(
			feeItems
				.map((item) => String(item.originalId || item.original_id || item.id).replace('fee-', ''))
				.filter(Boolean)
		);

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

		const newlyAddedItemIds = [];

		if (manageType === 'schedule') {
			const previousItemMap = new Map(
				scheduleItems.map((item) => [item.id, item])
			);

			const selectedItems = selectableScheduleItems
				.filter((item) => selectedScheduleIds.includes(String(item.id)))
				.map((item) => {
					const surveyItemId = `schedule-${item.id}`;
					const previousItem = previousItemMap.get(surveyItemId);
					const isNewItem = !previousItem;

					if (isNewItem) {
					newlyAddedItemIds.push(surveyItemId);
					}

					return {
						id: surveyItemId,
						originalId: String(item.id),
						title: item.title || item.name,
						date: getSchedulePeriodText(item),
						startDate: getScheduleDateText(
							item.start_at ||
							item.startAt ||
							item.start_date ||
							item.startDate ||
							item.date
						),
						endDate: getScheduleDateText(
							item.end_at ||
							item.endAt ||
							item.end_date ||
							item.endDate
						),

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
							getTotalMemberCount(),

						isNew: isNewItem,
						is_new: isNewItem,
					};
				})
				.sort((a, b) => {
					if (a.isNew !== b.isNew) {
						return a.isNew ? -1 : 1;
					}

					return getTimeValue(b) - getTimeValue(a);
				});

			nextScheduleItems = selectedItems;
			setScheduleItems(selectedItems);
			setActiveTab('schedule');
		}

		if (manageType === 'fee') {
			const previousItemMap = new Map(
				feeItems.map((item) => [item.id, item])
			);

			const selectedItems = selectableFeeItems
				.filter((item) => selectedFeeIds.includes(String(item.id)))
				.map((item) => {
					const surveyItemId = `fee-${item.id}`;
					const previousItem = previousItemMap.get(surveyItemId);
					const isNewItem = !previousItem;

					return {
						id: surveyItemId,
						originalId: String(item.id),
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
							getTotalMemberCount(),

						isNew: isNewItem,
						is_new: isNewItem,
					};
				})
				.sort((a, b) => {
					if (a.isNew !== b.isNew) {
						return a.isNew ? -1 : 1;
					}

					return getTimeValue(b) - getTimeValue(a);
				});

			nextFeeItems = selectedItems;
			setFeeItems(selectedItems);
			setActiveTab('fee');
		}

		setNewSurveyItemIds(newlyAddedItemIds);
		setIsSurveyManageOpen(false);

		try {
			const data = await saveSurveyItems(clubId, {
				schedule_items: nextScheduleItems,
				fee_items: nextFeeItems,
			});

			const mergedData = await mergeParticipationData(
				data.schedule_items || nextScheduleItems,
				data.fee_items || nextFeeItems
			);

			setScheduleItems(mergedData.scheduleItems);
			setScheduleUpdatedDate(data.schedule_updated_date || '');

			setFeeItems(mergedData.feeItems);
			setFeeUpdatedDate(data.fee_updated_date || '');
			
			if (data.schedule_items) {
				setSelectedScheduleIds(
					data.schedule_items
						.map((item) => item.originalId || item.original_id)
						.filter(Boolean)
				);
			}

			if (data.fee_items) {
				setSelectedFeeIds(
					data.fee_items
						.map((item) => item.originalId || item.original_id)
						.filter(Boolean)
				);
			}

			setNeedsResubmit(hasSubmitted);
			setMessage(data.message || '조사 항목이 저장되었습니다.');
		} catch (error) {
			console.error(error);
			setMessage(error?.message || '조사 항목 저장에 실패했습니다.');
		}
	};

	// 일정별 참여율 계산 함수 : articipants / totalMembers * 100
	const getParticipationRate = (item) => {
		const participants = Number(item.participants ?? 0);
		const totalMembers = Number(item.totalMembers ?? item.total_members ?? 0);

		if (!totalMembers) return '0%';

		return `${Math.round((participants / totalMembers) * 100)}%`;
	};

	/*
	참여율 값에 따라 배지 색상 클래스를 반환하는 함수

	60% 이상: 파란색
	40% 이상 60% 미만: 주황색
	40% 미만: 빨간색
*/
	const getParticipationBadgeClass = (item) => {
		const participants = Number(item.participants ?? 0);
		const totalMembers = Number(item.totalMembers ?? item.total_members ?? 0);
		
		if (!totalMembers) {
			return 'survey-participation-badge low';
		}

		const rate = Math.round((participants / totalMembers) * 100);

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
			<span className="sidebar-logo-cf">CM</span>
			<span className="sidebar-logo-text">Club Management</span>
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
							{canManageSurvey && (
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
			<CalendarDays size={19} />
			일정·출석 관리
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
								<p className="dashboard-label">Satisfaction Survey</p>
								<h1>만족도 조사</h1>
								<p className="dashboard-desc">
									이번 달 활동과 회비 사용에 대한 만족도를 평가해주세요.
								</p>
							</div>

							{/* 오른쪽 사용자 정보 영역 */}
							<div className="dashboard-user-box survey-header-actions">
								{/* 운영진에게만 보이는 조사 항목 관리 버튼 */}
								{canManageSurvey && (
									<>
										<button
											type="button"
											className="survey-result-button"
											onClick={handleOpenSurveyResult}
										>
											결과 분석
											
										</button>

										<button
											type="button"
											className="survey-manage-button"
											onClick={handleOpenSurveyManage}
										>
											조사 항목 관리
										</button>
									</>
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
										<span>일정 만족도</span>

										{scheduleUpdatedDate && (
											<small className="survey-tab-updated-date">
												{scheduleUpdatedDate} 수정
											</small>
										)}
									</button>

									<button
										type="button"
										className={activeTab === 'fee' ? 'survey-tab active' : 'survey-tab'}
										onClick={() => setActiveTab('fee')}
									>
										<CreditCard size={18} />
										<span>회비 사용 만족도</span>

										{feeUpdatedDate && (
											<small className="survey-tab-updated-date">
												{feeUpdatedDate} 수정
											</small>
										)}
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
															<h3>
																{item.title}

																{newSurveyItemIds.includes(item.id) && (
																	<span className="survey-new-mark">**</span>
																)}
															</h3>

															{activeTab === 'schedule' ? (
																<>
																	<p>{item.date}</p>
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
												등록된 일정 내역이 없습니다.
												<br />
												일정·출석 관리 페이지에서 일정을 먼저 등록해주세요.
											</p>
										</div>
									) : (
										selectableScheduleItems.map((item) => (
											<label className="survey-manage-check-row fee schedule-like-fee" key={item.id}>
												<input
													type="checkbox"
													checked={selectedScheduleIds.includes(String(item.id))}
													onChange={() => handleToggleScheduleItem(String(item.id))}
												/>

												{/* 이름 */}
												<strong className="survey-manage-fee-title">
													{item.title || item.name || '일정명 없음'}
												</strong>

												{/* 유형: 정기 모임 / 행사 / 모집 등 */}
												<em className="survey-manage-schedule-badge">
													{getScheduleTypeText(item)}
												</em>												

												{/* 기간: 시작일 ~ 종료일 */}
												<span className="survey-manage-fee-date">
													{getSchedulePeriodText(item)}
												</span>

												{/* 장소 */}
												<span className="survey-manage-fee-category">
													{item.location || '장소 정보 없음'}
												</span>

												{/* 상태 */}
												<span
												 	className={
														getScheduleStatusText(item) === '취소'
															? 'survey-manage-schedule-summary canceled'
															: 'survey-manage-schedule-summary'
													}
												>
													{getScheduleStatusText(item)}
												</span>
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
													checked={selectedFeeIds.includes(String(item.id))}
													onChange={() => handleToggleFeeItem(String(item.id))}
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
						{/* 운영진용 만족도 조사 결과 분석 모달 */}
		{isSurveyResultOpen && (
		  <div className="survey-result-modal-backdrop">
			<section className="survey-result-modal">
			  <div className="survey-result-modal-header">
				<div>
				  <p>Survey Analysis</p>
				  <h2>만족도 조사 결과 분석</h2>
				  <span>
					제출된 만족도 결과를 수치화하고 항목별 통계로 확인합니다.
				  </span>
				</div>

				<button
				  type="button"
				  className="survey-result-modal-close-button"
				  onClick={() => setIsSurveyResultOpen(false)}
				>
				  <X size={20} />
				</button>
			  </div>

			  {isSurveyResultLoading ? (
				<div className="survey-result-modal-empty">
				  결과 데이터를 불러오는 중입니다...
				</div>
			  ) : surveyResultError ? (
				<div className="survey-result-modal-empty error">
				  {surveyResultError}
				</div>
			  ) : (
				<>
				  <div className="survey-result-summary-grid">
					<article className="survey-result-summary-card">
					  <span>전체 평균 만족도</span>
					  <strong>
						{(surveyResultData?.summary?.overall_average || 0).toFixed(1)} / 5.0
					  </strong>
					  <p>
						{getSatisfactionLevel(
						  surveyResultData?.summary?.overall_average || 0
						)}
					  </p>
					</article>

					<article className="survey-result-summary-card">
					  <span>100점 환산 점수</span>
					  <strong>
						{surveyResultData?.summary?.overall_converted_score || 0}점
					  </strong>
					  <p>평균 만족도를 100점 기준으로 환산</p>
					</article>

					<article className="survey-result-summary-card">
					  <span>응답 인원</span>
					  <strong>
						{surveyResultData?.summary?.submitted_user_count || 0}명
					  </strong>
					  <p>
						전체 {surveyResultData?.summary?.total_member_count || 0}명 기준
					  </p>
					</article>

					<article className="survey-result-summary-card danger">
					  <span>개선 필요 항목</span>
					  <strong>
						{surveyResultData?.summary?.need_improve_count || 0}개
					  </strong>
					  <p>평균 2.5점 미만 항목 수</p>
					</article>
				  </div>

				  <div className="survey-result-modal-body">
					<div className="survey-result-modal-left">
					  <div className="survey-result-tab-row">
						<button
						  type="button"
						  className={
							resultActiveTab === 'schedule'
							  ? 'survey-result-tab active'
							  : 'survey-result-tab'
						  }
						  onClick={() => setResultActiveTab('schedule')}
						>
						  <CalendarDays size={17} />
						  일정 만족도
						</button>

						<button
						  type="button"
						  className={
							resultActiveTab === 'fee'
							  ? 'survey-result-tab active'
							  : 'survey-result-tab'
						  }
						  onClick={() => setResultActiveTab('fee')}
						>
						  <CreditCard size={17} />
						  회비 사용 만족도
						</button>
					  </div>

					  <div className="survey-result-list-box">
						<div className="survey-result-list-title">
						  <BarChart3 size={20} />
						  <div>
							<h3>항목별 만족도 결과</h3>
							<p>각 항목의 평균 점수와 점수 분포를 확인합니다.</p>
						  </div>
						</div>

						{(
						  resultActiveTab === 'schedule'
							? surveyResultData?.schedule_results || []
							: surveyResultData?.fee_results || []
						).length === 0 ? (
						  <div className="survey-result-modal-empty">
							아직 분석할 만족도 결과가 없습니다.
						  </div>
						) : (
						  <div className="survey-result-item-list">
							{(
							  resultActiveTab === 'schedule'
								? surveyResultData?.schedule_results || []
								: surveyResultData?.fee_results || []
							).map((item) => (
							  <article className="survey-result-item-card" key={item.id}>
								<div className="survey-result-item-header">
								  <div>
									<h4>{item.title}</h4>
									<p>
									  {item.date || '-'}
									  {resultActiveTab === 'fee' && (
										<>
										  {' '}· {item.type || '-'} · {item.category || '-'}
										</>
									  )}
									</p>
								  </div>

								  <em
									className={`survey-result-score-badge ${getSatisfactionLevelClass(
									  item.average_score
									)}`}
								  >
									{item.response_count > 0
									  ? `${Number(item.average_score).toFixed(1)}점`
									  : '미응답'}
									<span>
									  {getSatisfactionLevel(item.average_score)}
									</span>
								  </em>
								</div>

								<div className="survey-result-distribution">
								  {[5, 4, 3, 2, 1].map((score) => {
									const count = item.distribution?.[score] || 0;
									const responseCount = item.response_count || 0;
									const width = responseCount
									  ? Math.round((count / responseCount) * 100)
									  : 0;

									return (
									  <div className="survey-result-distribution-row" key={score}>
										<span>{score}점</span>

										<div className="survey-result-bar-track">
										  <div
											className="survey-result-bar-fill"
											style={{ width: `${width}%` }}
										  />
										</div>

										<strong>{count}명</strong>
									  </div>
									);
								  })}
								</div>
							  </article>
							))}
						  </div>
						)}
					  </div>
					</div>

					<aside className="survey-result-modal-right">
					  <section className="survey-result-side-card">
						<h3>
						  <TrendingDown size={18} />
						  개선 필요 TOP 3
						</h3>

						{(surveyResultData?.need_improve_items || []).length === 0 ? (
						  <p>평균 2.5점 미만의 개선 필요 항목이 없습니다.</p>
						) : (
						  <ol>
							{(surveyResultData?.need_improve_items || []).map((item) => (
							  <li key={item.id}>
								<strong>{item.title}</strong>
								<span>{Number(item.average_score).toFixed(1)}점</span>
							  </li>
							))}
						  </ol>
						)}
					  </section>

					  <section className="survey-result-side-card">
						<h3>
						  <Star size={18} />
						  자동 분석 코멘트
						</h3>

						<p>
						  전체 만족도는{' '}
						  {(surveyResultData?.summary?.overall_average || 0).toFixed(1)}점이며,
						  만족도 수준은{' '}
						  {getSatisfactionLevel(
							surveyResultData?.summary?.overall_average || 0
						  )}
						  입니다.
						</p>

						<p>
						  평균 점수가 낮은 항목은 다음 운영 회의에서 우선적으로
						  검토하는 것이 좋습니다.
						</p>
					  </section>
					</aside>
				  </div>
													  <section className="survey-result-chart-section">
					<div className="survey-result-chart-title">
					  <BarChart3 size={20} />
					  <div>
						<h3>전체 만족도 점수 분포</h3>
						<p>제출된 모든 응답 건수를 1점부터 5점까지 집계한 결과입니다.</p>
					  </div>
					</div>

					<div className="survey-result-chart-box">
					  {[5, 4, 3, 2, 1].map((score) => {
						const distribution = getOverallDistribution();
						const count = distribution[score] || 0;
						const maxCount = Math.max(...Object.values(distribution), 1);
						const height = Math.max((count / maxCount) * 100, count > 0 ? 12 : 0);

						return (
						  <div className="survey-result-chart-column" key={score}>
							<strong>{count}건</strong>

							<div className="survey-result-chart-bar-wrap">
							  <div
								className={`survey-result-chart-bar score-${score}`}
								style={{ height: `${height}%` }}
							  />
							</div>

							<span>{score}점</span>
						  </div>
						);
					  })}
					</div>
				  </section>
				</>
			  )}
			</section>
		  </div>
		)}
			</div>
		</div>
	);
}

export default ClubSurveyPage;