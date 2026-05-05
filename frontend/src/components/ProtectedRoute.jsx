import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../api/accounts.js';

function ProtectedRoute({ children }) {
  const [authStatus, setAuthStatus] = useState('checking');

  useEffect(() => {
    async function checkLoginStatus() {
      try {
        await getCurrentUser();
        setAuthStatus('authenticated');
      } catch (error) {
        console.error(error);
        setAuthStatus('unauthenticated');
      }
    }

    checkLoginStatus();
  }, []);

  if (authStatus === 'checking') {
    return <p>로그인 상태를 확인하는 중입니다...</p>;
  }

  if (authStatus === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;