import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { getCurrentUser, logout } from '../api/accounts.js';

function MyPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const data = await getCurrentUser();
        setProfile(data.profile);
      } catch (error) {
        console.error(error);
        alert('로그인이 필요합니다.');
        navigate('/login');
      }
    }

    fetchCurrentUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      alert('로그아웃되었습니다.');
      navigate('/login');
    } catch (error) {
      console.error(error);
      setErrorMessage('로그아웃 처리 중 문제가 발생했습니다.');
    }
  };

  if (errorMessage) {
    return (
      <AuthLayout title="마이페이지" subtitle="계정 정보를 확인할 수 없습니다.">
        <p className="form-error-text">{errorMessage}</p>
      </AuthLayout>
    );
  }

  if (!profile) {
    return (
      <AuthLayout title="마이페이지" subtitle="사용자 정보를 불러오는 중입니다.">
        <p className="profile-loading-text">잠시만 기다려주세요.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="마이페이지" subtitle="내 계정 정보를 확인하세요.">
      <div className="profile-card">
        <div className="profile-summary">
          <div className="profile-avatar">
            {profile.nickname?.charAt(0) || profile.username?.charAt(0)}
          </div>

          <div>
            <h3>{profile.nickname}</h3>
            <p>{profile.username}</p>
          </div>
        </div>

        <div className="profile-info-list">
          <div className="profile-info-row">
            <span>아이디</span>
            <strong>{profile.username}</strong>
          </div>

          <div className="profile-info-row">
            <span>이메일</span>
            <strong>{profile.email}</strong>
          </div>

          <div className="profile-info-row">
            <span>학교</span>
            <strong>{profile.school_name}</strong>
          </div>

          <div className="profile-info-row">
            <span>학과</span>
            <strong>{profile.department}</strong>
          </div>

          <div className="profile-info-row">
            <span>학번</span>
            <strong>{profile.student_id}</strong>
          </div>

          <div className="profile-info-row">
            <span>전화번호</span>
            <strong>{profile.phone_number || '미입력'}</strong>
          </div>

          <div className="profile-info-row">
            <span>역할</span>
            <strong>{profile.role}</strong>
          </div>
        </div>

        <div className="profile-button-group">
          <Link to="/profile/edit" className="primary-link-button">
            프로필 수정
          </Link>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}

export default MyPage;