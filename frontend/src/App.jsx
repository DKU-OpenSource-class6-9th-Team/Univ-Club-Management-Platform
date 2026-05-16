import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import MyPage from './pages/MyPage.jsx'
import ProfileEditPage from './pages/ProfileEditPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx'
import DeleteAccountComplete from './pages/AccountDeleteComplete.jsx'
import ClubCreatePage from './pages/club/ClubCreatePage.jsx'
import ClubDashboardPage from './pages/club/ClubDashboardPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/mypage"
        element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <ProfileEditPage />
          </ProtectedRoute>
        }
      />

      <Route 
        path="/delete-account-complete" 
        element={<DeleteAccountComplete />
        } 
      />
      
      <Route path="/clubs/create" element={<ClubCreatePage />} />
  
      <Route path="/club/dashboard" element={<ClubDashboardPage />} />
    
    </Routes>
  )
}

export default App