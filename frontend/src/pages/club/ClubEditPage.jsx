import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  Edit3,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircleHeart,
  MapPin,
  Phone,
  User,
  Users,
} from 'lucide-react';

// 동아리 상세 조회 API, 동아리 수정 API 가져오기
import { getClub, updateClub } from '../../api/clubs.js';

// 대시보드와 같은 사이드바/상단 레이아웃을 쓰기 위한 CSS
import '../../styles/club/clubDashboard.css';

// 동아리 등록 페이지에서 사용한 form 스타일을 재사용
import '../../styles/club/clubCreate.css';

function ClubEditPage() {
  // 버튼 클릭 후 페이지 이동을 위해 사용
  const navigate = useNavigate();

  // URL 주소의 /club/:clubId/edit 에서 clubId 값을 가져옴
  const { clubId } = useParams();

  // 로그인할 때 localStorage에 저장한 사용자 정보 가져오기
  const loginUser = JSON.parse(localStorage.getItem('loginUser')) || {};

  // 현재 로그인한 사용자가 동아리 관리자인지 확인
  // 관리자일 때만 동아리 정보 수정 메뉴를 보여주기 위해 사용
  const isClubManager = loginUser.role === 'CLUB_MANAGER';

  // 동아리 정보를 불러오는 중인지 저장
  const [isLoading, setIsLoading] = useState(true);

  // 수정 버튼을 누른 뒤 저장 중인지 저장
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 에러 메시지를 화면에 보여주기 위한 상태
  const [errorMessage, setErrorMessage] = useState('');

  // 기존에 등록되어 있던 동아리 이미지 주소 저장
  // 새 이미지를 선택하기 전까지 현재 이미지를 미리 보여주기 위해 사용
  const [currentImage, setCurrentImage] = useState('');

  // 이미지 삭제 시 기본 아이콘으로 돌아기기 위한 상태
  const [removeImage, setRemoveImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const imageInputRef = useRef(null);

  // 이미지 주소를 화면에 표시 가능한 전체 주소로 바꿔주는 함수
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';

    if (imageUrl.startsWith('http')) {
        return imageUrl;
    }

    return `http://localhost:8000${imageUrl}`;
 };

  // 수정 폼에 들어갈 입력값들
  // 처음에는 빈 값으로 두고, getClub API로 받아온 값으로 채움
  const [formData, setFormData] = useState({
    school: '단국대학교',
    clubName: '',
    clubType: 'CENTRAL',
    description: '',
    recruitType: 'ALWAYS',
    startDate: '',
    endDate: '',
    capacity: '',
    recruitMembers: '',
    leaderName: '',
    phone: '',
    email: '',
    clubRoom: '',
    image: null,
  });

  // 페이지가 처음 열릴 때, 또는 clubId가 바뀔 때 실행됨
  // 현재 동아리 정보를 백엔드에서 불러와서 수정 폼에 미리 넣어줌
  useEffect(() => {
    const fetchClub = async () => {
      try {
        // clubId에 해당하는 동아리 상세 정보 가져오기
        const club = await getClub(clubId);

        // 백엔드에서 가져온 값을 formData 구조에 맞게 변환해서 저장
        setFormData({
          // 현재 Club 모델에는 school 필드가 따로 없으므로 기본값 유지
          school: '단국대학교',

          // 동아리명
          clubName: club.name || '',

          // 동아리 구분
          // club_type이 있으면 club_type 사용, 없으면 category 사용
          clubType: club.club_type || club.category || 'CENTRAL',

          // 동아리 소개
          description: club.description || '',

          // 모집 시작일/마감일이 있으면 기간 지정 모집으로 판단
          // 둘 다 없으면 상시 모집으로 판단
          recruitType:
            club.recruit_start_date || club.recruit_end_date
              ? 'PERIOD'
              : 'ALWAYS',

          // 모집 기간
          startDate: club.recruit_start_date || '',
          endDate: club.recruit_end_date || '',

          // 총 정원
          capacity: club.capacity || '',

          // 이번 모집 인원
          recruitMembers: club.recruit_members || '',

          // 대표자 및 연락 정보
          leaderName: club.leader_name || '',
          phone: club.contact_phone || '',
          email: club.contact_email || '',

          // 동방 위치
          clubRoom: club.location || '',

          // 새로 선택한 이미지는 아직 없으므로 null
          image: null,
        });

        // 기존 이미지가 있으면 따로 저장해서 미리보기로 보여줌
        setCurrentImage(club.image || '');
      } catch (error) {
        console.error(error);
        setErrorMessage('동아리 정보를 불러오지 못했습니다.');
      } finally {
        // 성공/실패와 관계없이 로딩 종료
        setIsLoading(false);
      }
    };

    fetchClub();
  }, [clubId]);

  // input, select, textarea 값이 바뀔 때마다 formData에 반영
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 기존 이미지 삭제 함수(기존 이미지를 화면에서 없애고, 파일 선택도 초기 상태처럼)
  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
    }));

    setPreviewImage(null);
    setRemoveImage(true);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // 파일 input에서 새 이미지를 선택했을 때 실행, 새 이미지를 선택하면 삭제 상태를 취소
  const handleImageChange = (event) => {
    const file = event.target.files[0];

    setFormData((prev) => ({
      ...prev,
      image: file,
    }));

    if (file) {
      setPreviewImage(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };
  
  // 모집 상태를 자동으로 계산하는 함수
  // 상시 모집이면 바로 모집중
  // 기간 지정 모집이면 오늘 날짜가 기간 안에 있는지 확인
  const getRecruitStatus = () => {
    // 상시 모집일 경우
    if (formData.recruitType === 'ALWAYS') {
      return '모집중';
    }

    // 기간 지정 모집인데 날짜가 비어 있을 경우
    if (!formData.startDate || !formData.endDate) {
      return '모집 기간을 입력해주세요';
    }

    // 오늘 날짜, 모집 시작일, 모집 마감일을 Date 객체로 변환
    const today = new Date();
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    // 시간 차이 때문에 날짜 비교가 어긋나지 않도록 시/분/초를 0으로 맞춤
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // 아직 모집 시작 전
    if (today < start) {
      return '모집 예정';
    }

    // 오늘이 모집 기간 안에 포함되는 경우
    if (today >= start && today <= end) {
      return '모집중';
    }

    // 모집 기간이 지난 경우
    return '마감';
  };

  // 로그아웃 버튼 클릭 시 로그인 정보 삭제 후 로그인 페이지로 이동
  const handleLogout = () => {
    localStorage.removeItem('loginUser');
    navigate('/login');
  };

  // 수정 폼 제출 시 실행
  const handleSubmit = async (event) => {
    // form 기본 새로고침 동작 막기
    event.preventDefault();

    // 이전 에러 메시지 초기화
    setErrorMessage('');

    // 기간 지정 모집인데 시작일이 비어 있으면 저장 막기
    if (formData.recruitType === 'PERIOD' && !formData.startDate) {
      setErrorMessage('모집 시작일을 입력해주세요.');
      return;
    }

    // 기간 지정 모집인데 마감일이 비어 있으면 저장 막기
    if (formData.recruitType === 'PERIOD' && !formData.endDate) {
      setErrorMessage('모집 마감일을 입력해주세요.');
      return;
    }

    try {
      // 저장 중 상태로 변경
      setIsSubmitting(true);

      // 백엔드 Club 모델 필드명에 맞게 데이터 구성
      const clubData = {
        name: formData.clubName,
        category: formData.clubType,
        club_type: formData.clubType,
        description: formData.description,

        // 모집 상태가 모집중일 때만 true로 저장
        is_recruiting: getRecruitStatus() === '모집중',

        // 상시 모집이면 날짜는 빈 값으로 보냄
        recruit_start_date:
          formData.recruitType === 'PERIOD' ? formData.startDate : '',
        recruit_end_date:
          formData.recruitType === 'PERIOD' ? formData.endDate : '',

        // 총 정원 / 이번 모집 인원
        capacity: formData.capacity,
        recruit_members: formData.recruitMembers,

        // 대표자 및 연락 정보
        leader_name: formData.leaderName,
        contact_phone: formData.phone,
        contact_email: formData.email,

        // 동방 위치
        location: formData.clubRoom,

        // 새 이미지 파일
        // 새 이미지를 선택하지 않으면 null이므로 기존 이미지는 유지됨
        image: formData.image,
        // 이미지 삭제 여부
        remove_image: removeImage,
      };

      // PATCH 요청으로 동아리 정보 수정
      await updateClub(clubId, clubData);

      alert('동아리 정보가 수정되었습니다.');

      // 수정 완료 후 동아리 정보 확인 페이지로 이동
      navigate(`/club/${clubId}/info`);
    } catch (error) {
      console.error(error);
      setErrorMessage('동아리 정보 수정에 실패했습니다. 입력값을 다시 확인해주세요.');
    } finally {
      // 저장 중 상태 해제
      setIsSubmitting(false);
    }
  };

  // 아직 기존 동아리 정보를 불러오는 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="club-dashboard-page">
        <div className="club-info-loading">
          동아리 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  return (
    <div className="club-dashboard-page">
      <div className="dashboard-fixed-canvas">
        {/* ==============================
            왼쪽 사이드바 영역
        =============================== */}
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
            {/* 대시보드 이동 */}
            <Link to={`/club/${clubId}/dashboard`} className="sidebar-link">
              <LayoutDashboard size={19} />
              대시보드
            </Link>

            {/* 동아리 정보 메뉴 그룹 */}
            <div className="sidebar-menu-group">
              {/* 동아리 정보 확인 페이지 이동 */}
              <Link
                to={`/club/${clubId}/info`}
                className="sidebar-link sidebar-parent-link"
              >
                <FileText size={19} />
                동아리 정보
              </Link>

              {/* 운영진일 때만 동아리 정보 수정 메뉴 표시 */}
              {isClubManager && (
                <div className="sidebar-submenu">
                  <Link
                    to={`/club/${clubId}/edit`}
                    className="sidebar-sub-link active"
                  >
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

            <Link to={`/club/${clubId}/survey`} className="sidebar-link">
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

        {/* ==============================
            오른쪽 메인 영역
        =============================== */}
        <main className="dashboard-main club-info-main">
          <div className="dashboard-frame club-info-frame">
            {/* 브레드크럼 */}
            <nav className="dashboard-breadcrumb">
              <Link to="/main">플랫폼 메인</Link>
              <span>›</span>
              <Link to="/main">내 동아리</Link>
              <span>›</span>
              <Link to={`/club/${clubId}/info`}>
                {formData.clubName || '동아리'}
              </Link>
              <span>›</span>
              <span className="breadcrumb-current">동아리 정보 수정</span>
            </nav>

            {/* 상단 헤더 */}
            <header className="dashboard-header">
              <div>
                <p className="dashboard-label">Club Edit</p>
                <h1>동아리 정보 수정</h1>
                <p className="dashboard-desc">
                  동아리 등록 시 입력한 기본 정보와 모집 정보를 수정할 수 있습니다.
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

            {/* ==============================
                동아리 정보 수정 폼 영역
            =============================== */}
            <section className="club-info-content">
              <form
                className="auth-commonform club-create-form"
                onSubmit={handleSubmit}
              >
                {/* 소속 학교 */}
                <label className="form-label">
                  <span>소속 학교</span>
                  <div className="input-box">
                    <Building2 size={20} />
                    <select
                      name="school"
                      value={formData.school}
                      onChange={handleChange}
                      required
                    >
                      <option value="단국대학교">단국대학교</option>
                      <option value="경희대학교">경희대학교</option>
                    </select>
                  </div>
                </label>

                {/* 동아리명 */}
                <label className="form-label">
                  <span>동아리명</span>
                  <div className="input-box">
                    <Users size={20} />
                    <input
                      type="text"
                      name="clubName"
                      value={formData.clubName}
                      onChange={handleChange}
                      placeholder="동아리명을 입력하세요"
                      required
                    />
                  </div>
                </label>

                {/* 동아리 구분 */}
                <label className="form-label">
                  <span>동아리 구분</span>
                  <div className="input-box">
                    <Building2 size={20} />
                    <select
                      name="clubType"
                      value={formData.clubType}
                      onChange={handleChange}
                      required
                    >
                      <option value="CENTRAL">중앙동아리</option>
                      <option value="TEMPORARY">기타동아리(가등록)</option>
                    </select>
                  </div>
                </label>

                {/* 동아리 소개 */}
                <label className="form-label">
                  <span>동아리 소개</span>
                  <div className="club-description-box">
                    <textarea
                      className="club-description-textarea"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="동아리 소개를 입력하세요"
                      required
                    />
                  </div>
                </label>

                {/* 모집 여부 */}
                <label className="form-label">
                  <span>모집 여부</span>
                  <div className="input-box">
                    <CalendarDays size={20} />
                    <select
                      name="recruitType"
                      value={formData.recruitType}
                      onChange={handleChange}
                      required
                    >
                      <option value="ALWAYS">상시 모집</option>
                      <option value="PERIOD">기간 지정 모집</option>
                    </select>
                  </div>
                </label>

                {/* 기간 지정 모집일 때만 모집 시작일/마감일 입력창 표시 */}
                {formData.recruitType === 'PERIOD' && (
                  <div className="date-row">
                    <label className="form-label">
                      <span>모집 시작일</span>
                      <div className="input-box">
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleChange}
                        />
                      </div>
                    </label>

                    <label className="form-label">
                      <span>모집 마감일</span>
                      <div className="input-box">
                        <input
                          type="date"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleChange}
                        />
                      </div>
                    </label>
                  </div>
                )}

                {/* 모집 상태 자동 표시 */}
                <label className="form-label">
                  <span>모집 상태</span>
                  <div className="input-box status-box">
                    <input type="text" value={getRecruitStatus()} readOnly />
                  </div>
                  <span className="form-desc">
                    <small>모집 방식과 모집 기간에 따라 자동으로 표시됩니다.</small>
                  </span>
                </label>

                {/* 총 정원 */}
                <label className="form-label">
                  <span>총 정원</span>
                  <div className="input-box">
                    <Users size={20} />
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      placeholder="예: 50"
                      min="1"
                    />
                  </div>
                </label>

                {/* 이번 모집 인원 */}
                <label className="form-label">
                  <span>이번 모집 인원</span>
                  <div className="input-box">
                    <Users size={20} />
                    <input
                      type="number"
                      name="recruitMembers"
                      value={formData.recruitMembers}
                      onChange={handleChange}
                      placeholder="예: 20"
                      min="1"
                    />
                  </div>
                </label>

                {/* 대표자 이름 */}
                <label className="form-label">
                  <span>대표자 이름</span>
                  <div className="input-box">
                    <User size={20} />
                    <input
                      type="text"
                      name="leaderName"
                      value={formData.leaderName}
                      onChange={handleChange}
                      placeholder="대표자 이름을 입력하세요"
                      required
                    />
                  </div>
                </label>

                {/* 전화번호 */}
                <label className="form-label">
                  <span>전화번호</span>
                  <div className="input-box">
                    <Phone size={20} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="예: 010-1234-5678"
                    />
                  </div>
                </label>

                {/* 이메일 */}
                <label className="form-label">
                  <span>이메일</span>
                  <div className="input-box">
                    <Mail size={20} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="예: club@dankook.ac.kr"
                    />
                  </div>
                </label>

                {/* 동방 위치 */}
                <label className="form-label">
                  <span>동방 위치</span>
                  <div className="input-box">
                    <MapPin size={20} />
                    <input
                      type="text"
                      name="clubRoom"
                      value={formData.clubRoom}
                      onChange={handleChange}
                      placeholder="예: 학생회관 302호"
                    />
                  </div>
                </label>

                {/* 동아리 이미지 수정 */}
                <label className="form-label">
                  <span>동아리 이미지</span>

                  {/* 1. 새로 선택한 이미지가 있을 때 */}
                  {previewImage ? (
                    <div className="club-current-image-box">
                      <img src={previewImage} alt="새로 선택한 동아리 이미지" />

                      <button
                        type="button"
                        className="club-image-remove-button"
                        onClick={handleRemoveImage}
                      >
                        이미지 삭제
                      </button>
                    </div>
                  ) : currentImage && !removeImage ? (
                    /* 2. 기존 등록 이미지가 있고, 아직 삭제하지 않았을 때 */
                    <div className="club-current-image-box">
                      <img
                        src={getImageUrl(currentImage)}
                        alt="현재 등록된 동아리 이미지"
                      />

                      <button
                        type="button"
                        className="club-image-remove-button"
                        onClick={handleRemoveImage}
                      >
                        이미지 삭제
                      </button>
                    </div>
                  ) : (
                    /* 3. 이미지가 없거나 삭제 버튼을 누른 상태 */
                    <div className="club-image-empty-box">
                      <FileText size={24} />
                      <span>등록된 이미지가 없습니다.</span>
                    </div>
                  )}

                  {/* 새 이미지 파일 선택 */}
                  <div className="input-box">
                    <FileText size={20} />
                    <input
                      ref={imageInputRef}
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>
                </label>

                {/* 에러 메시지 출력 */}
                {errorMessage && (
                  <p className="form-error-text">{errorMessage}</p>
                )}

                {/* 취소 / 수정 버튼 영역 */}
                <div className="club-edit-button-row">
                  <Link
                    to={`/club/${clubId}/info`}
                    className="club-edit-cancel-button"
                  >
                    취소
                  </Link>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '수정 중...' : '동아리 정보 수정하기'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ClubEditPage;