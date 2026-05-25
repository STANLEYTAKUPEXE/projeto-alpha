import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminLayout() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-text">⚙️ Admin</h1>
          <p className="text-text-muted text-xs">{profile?.full_name}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-text-muted text-sm border border-border rounded-lg px-3 py-1.5"
        >
          ← App
        </button>
      </header>

      <nav className="bg-card border-b border-border flex overflow-x-auto">
        {[
          { to: '/admin/matches', label: '🏟️ Jogos' },
          { to: '/admin/users', label: '👥 Usuários' },
          { to: '/admin/stats', label: '📊 Stats' },
        ].map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}
