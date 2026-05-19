import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import DeleteAccount from '../components/DeleteAccountConfirm.jsx';
import { delete_account, getCurrentUser, logout } from '../api/accounts.js';

function MyPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  //회원탈퇴용 state 추가
  const [showDeleteNotice, setShowDeleteNotice] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');

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

  const deleteAccount_confirm = () => {
    setDeleteAccountError('');
    setShowDeleteNotice(true);
  };

  const cancelDeleteAccount = () => {
    setShowDeleteNotice(false);
    setDeleteAccountError('');
  };

  const confirmDeleteAccount = async ({ password }) => {
  setDeleteAccountError('');

  try {
    await delete_account({
      password: password,
    });

    alert('회원탈퇴 되었습니다.');
    navigate('/delete-account-complete');
  } catch (error) {
    console.error(error);

    if (error.password) {
      setDeleteAccountError('비밀번호가 올바르지 않습니다.');
    } else if (error.message) {
      setDeleteAccountError(error.message);
    } else {
      setDeleteAccountError('오류가 발생하여 회원탈퇴에 실패했습니다. 다시 입력해주세요.');
    }
  } 
};

  if (errorMessage) {
    return (
      <AuthLayout
        title="마이페이지"
        subtitle="계정 정보를 확인할 수 없습니다."
        headerButtonText="메인화면으로"
        headerButtonTo="/main"
      >
        <p className="form-error-text">{errorMessage}</p>
      </AuthLayout>
    );
  }

  if (!profile) {
    return (
      <AuthLayout
        title="마이페이지"
        subtitle="사용자 정보를 불러오는 중입니다."
        headerButtonText="메인화면으로"
        headerButtonTo="/main"
      >
        <p className="profile-loading-text">잠시만 기다려주세요.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="마이페이지"
      subtitle="내 계정 정보를 확인하세요."
      headerButtonText="메인화면으로"
      headerButtonTo="/main"
    >
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

          <button
            type='button'
            className='delete-account-button'
            onClick={deleteAccount_confirm}
          >
            회원탈퇴
          </button>
        </div>
      </div>

      <DeleteAccount
        isOpen={showDeleteNotice}
        errorMessage={deleteAccountError}
        cancel={cancelDeleteAccount}
        confirm={confirmDeleteAccount}
        />

    </AuthLayout>
  );
}

export default MyPage;