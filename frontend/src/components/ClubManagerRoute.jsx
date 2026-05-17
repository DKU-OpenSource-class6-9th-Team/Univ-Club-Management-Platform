import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../api/accounts.js'

function ClubManagerRoute({ children }) {
  const [authStatus, setAuthStatus] = useState('checking')

  useEffect(() => {
    async function checkRole() {
      try {
        const data = await getCurrentUser()
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