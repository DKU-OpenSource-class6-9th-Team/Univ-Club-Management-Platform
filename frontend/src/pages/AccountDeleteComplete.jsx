import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';

function DeleteAccountComplete() {
  const navigate = useNavigate();

  return (
    <AuthLayout title="회원탈퇴 완료" subtitle="계정 정보가 삭제되었습니다.">
      <div className="delete-account-complete-card">
        <div className="delete-account-complete-icon">✓</div>

        <h3>회원탈퇴가 완료되었습니다.</h3>

        <button
          type="button"
          className="primary-button"
          onClick={() => navigate('/login')}
        >
          로그인 화면으로 이동
        </button>
      </div>
    </AuthLayout>
  );
}

export default DeleteAccountComplete;