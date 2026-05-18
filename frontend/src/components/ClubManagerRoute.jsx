/*로그인한 사용자가 동아리 관리자 권한을 가진 사람인지 판단 및 보호 라우트
- 운영진 계정이라면 페이지 볼 수 있고 수정 가능
- 일반 사용자라면 페이지 들어가고 현재는(mypage)로 이동
- 로그인 안된 사용자는 로그인 페이지로 이동*/

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../api/accounts.js' //백엔드에서 현재 로그인 사용자 정보 가져오기

function ClubManagerRoute({ children }) {
  //가능한 상태(checking, authorized, forbidden(권한 없음), unauthenticated)
  const [authStatus, setAuthStatus] = useState('checking')

  useEffect(() => {
    async function checkRole() {
      try {
        const data = await getCurrentUser() //현재 사용자 정보 요청
        const role = data?.profile?.role

        if (role === 'CLUB_MANAGER') {
          setAuthStatus('authorized')
          return
        }

        setAuthStatus('forbidden')
      } catch (error) {
        console.error(error)
        setAuthStatus('unauthenticated')
      }
    }

    checkRole()
  }, [])

  if (authStatus === 'checking') {
    return <p>접근 권한을 확인하는 중입니다...</p>
  }

  if (authStatus === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (authStatus === 'forbidden') {
    return <Navigate to="/mypage" replace />
  }

  return children
}

export default ClubManagerRoute