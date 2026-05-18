import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import MyPage from './pages/MyPage.jsx'
import ProfileEditPage from './pages/ProfileEditPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx'
import DeleteAccountComplete from './pages/AccountDeleteComplete.jsx'
import MainPage from './pages/MainPage.jsx';
import ClubCreatePage from './pages/club/ClubCreatePage.jsx'
import ClubDashboardPage from './pages/club/ClubDashboardPage.jsx'
import ClubInfoPage from './pages/club/ClubInfoPage.jsx';

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
        path="/main"
        element={
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/club/create"
        element={
          <ProtectedRoute>
            <ClubCreatePage />
          </ProtectedRoute>
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
      
      <Route path="/main" element={<MainPage />} />

      <Route path="/club/create" element={<ClubCreatePage />} />
  
      <Route path="/club/:clubId/dashboard" element={<ClubDashboardPage />} />
      <Route path="/club/:clubId/info" element={<ClubInfoPage />} />

    </Routes>
  )
}

export default App