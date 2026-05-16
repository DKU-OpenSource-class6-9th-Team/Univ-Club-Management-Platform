import { useState } from 'react';
import {
  Building2,
  CalendarDays,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
} from 'lucide-react';
import AuthLayout from '../../components/AuthLayout.jsx';

import '../../styles/club/clubCreate.css';

function ClubCreatePage() {
  const [formData, setFormData] = useState({
    school: '단국대학교',
    clubName: '',
    clubType: 'CENTRAL',
    description: '',
    recruitType: 'ALWAYS',
    startDate: '',
    endDate: '',
    maxMembers: '',
    leaderName: '',
    phone: '',
    email: '',
    clubRoom: '',
  });

  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getRecruitStatus = () => {
    if (formData.recruitType === 'ALWAYS') {
      return '모집중';
    }

    if (!formData.startDate || !formData.endDate) {
      return '모집 기간을 입력해주세요';
    }

    const today = new Date();
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (today < start) {
      return '모집 예정';
    }

    if (today >= start && today <= end) {
      return '모집중';
    }

    return '마감';
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setErrorMessage('');

    if (formData.recruitType === 'PERIOD' && !formData.startDate) {
      setErrorMessage('모집 시작일을 입력해주세요.');
      return;
    }

    if (formData.recruitType === 'PERIOD' && !formData.endDate) {
      setErrorMessage('모집 마감일을 입력해주세요.');
      return;
    }

    const clubData = {
      ...formData,
      recruitStatus: getRecruitStatus(),
    };

    console.log('동아리 등록 데이터:', clubData);
    alert('동아리 등록 정보가 임시 저장되었습니다. 이후 API 연동 시 서버로 전송하면 됩니다.');
  };

  return (
    <AuthLayout
      title="동아리 정보 등록"
      subtitle="동아리 기본 정보와 모집 정보를 입력해주세요"
    >
      <form className="auth-commonform club-create-form" onSubmit={handleSubmit}>
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

        <label className="form-label">
          <span>모집 상태</span>
          <div className="input-box status-box">
            <input type="text" value={getRecruitStatus()} readOnly />
          </div>
          <span className="form-desc">
            <small>모집 방식과 모집 기간에 따라 자동으로 표시됩니다.</small>
          </span>
        </label>

        <label className="form-label">
          <span>모집 인원</span>
          <div className="input-box">
            <Users size={20} />
            <input
              type="number"
              name="maxMembers"
              value={formData.maxMembers}
              onChange={handleChange}
              placeholder="예: 20"
              min="1"
            />
          </div>
        </label>

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

        {errorMessage && (
          <p className="form-error-text">{errorMessage}</p>
        )}

        <button type="submit" className="primary-button">
          동아리 등록하기
        </button>

        <p className="auth-guide-text">
          등록 후 동아리 관리 페이지에서 대표 이미지를 변경할 수 있습니다.
        </p>
      </form>
    </AuthLayout>
  );
}

export default ClubCreatePage;