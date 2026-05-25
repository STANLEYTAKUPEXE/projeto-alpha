import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/', label: 'Jogos', icon: '🏟️', exact: true },
  { to: '/ranking', label: 'Ranking', icon: '🏆' },
  { to: '/profile', label: 'Perfil', icon: '👤' },
  { to: '/rules', label: 'Regras', icon: '📋' },
]

export default function BottomNav() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                isActive ? 'text-accent' : 'text-text-muted'
              }`
            }
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
        {profile?.level === 'core' && (
          <button
            onClick={() => navigate('/admin')}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-warning transition-colors"
          >
            <span className="text-xl leading-none">⚙️</span>
            <span className="text-xs font-medium">Admin</span>
          </button>
        )}
      </div>
    </nav>
  )
}
