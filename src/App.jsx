import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/auth/LoginPage'
import PlayerLayout from './pages/player/PlayerLayout'
import HomePage from './pages/player/HomePage'
import RankingPage from './pages/player/RankingPage'
import ProfilePage from './pages/player/ProfilePage'
import RulesPage from './pages/player/RulesPage'
import AdminLayout from './pages/admin/AdminLayout'
import ManageMatchesPage from './pages/admin/ManageMatchesPage'
import ManageUsersPage from './pages/admin/ManageUsersPage'
import StatsPage from './pages/admin/StatsPage'
import Skeleton from './components/ui/Skeleton'

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-3xl">⚽</span>
          </div>
          <div className="text-text-muted text-sm">Carregando...</div>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  if (!profile) return <Navigate to="/login" replace />

  if (profile.level === 'core') {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<ManageMatchesPage />} />
          <Route path="matches" element={<ManageMatchesPage />} />
          <Route path="users" element={<ManageUsersPage />} />
          <Route path="stats" element={<StatsPage />} />
        </Route>
        <Route path="/" element={<PlayerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="rules" element={<RulesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<PlayerLayout />}>
        <Route index element={<HomePage />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="rules" element={<RulesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
