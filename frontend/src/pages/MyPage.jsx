import { useNavigate } from 'react-router-dom';
import { logout } from '../api/accounts.js';

function MyPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    alert('로그아웃되었습니다.');
    navigate('/login');
  };

  return (
    <div>
      <h1>마이페이지</h1>
      <p>로그인 후 이동되는 임시 마이페이지입니다.</p>

      <button type="button" onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}

export default MyPage;