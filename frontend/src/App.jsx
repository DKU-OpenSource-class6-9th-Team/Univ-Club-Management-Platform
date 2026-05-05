import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import MyPage from './pages/MyPage.jsx'
import ProfileEditPage from './pages/ProfileEditPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/profile/edit" element={<ProfileEditPage />} />
    </Routes>
  )
}

export default App