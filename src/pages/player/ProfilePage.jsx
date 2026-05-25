import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const levelLabel = { candidate: 'Candidato', verified: 'Verificado', core: 'Admin' }
const levelEmoji = { candidate: '🔰', verified: '✅', core: '⭐' }

export default function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [history, setHistory] = useState([])
  const [chartData, setChartData] = useState([])
  const [stats, setStats] = useState({ total: 0, attended: 0, streak: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchData()
  }, [profile])

  async function fetchData() {
    const [{ data: pointHistory }, { data: participations }] = await Promise.all([
      supabase.from('point_history').select('*, matches(date)').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('match_participants').select('status, matches(date)').eq('user_id', profile.id).order('created_at', { ascending: false }),
    ])

    setHistory(pointHistory || [])

    const attended = (participations || []).filter(p => p.status === 'confirmed').length
    const total = (participations || []).filter(p => ['confirmed', 'no_show'].includes(p.status)).length
    setStats({ total, attended, streak: calcStreak(participations || []) })

    const last30 = buildChartData(pointHistory || [])
    setChartData(last30)
    setLoading(false)
  }

  function calcStreak(participations) {
    let streak = 0
    const sorted = [...participations].sort((a, b) => new Date(b.matches?.date) - new Date(a.matches?.date))
    for (const p of sorted) {
      if (p.status === 'confirmed') streak++
      else break
    }
    return streak
  }

  function buildChartData(history) {
    let running = profile.points
    const points = history.slice(0, 30).reverse().map((h, i) => {
      const val = running
      running -= h.points_change
      return { day: i + 1, points: val }
    })
    return points
  }

  const attendanceRate = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-text mb-6">Meu Perfil</h1>

      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-3xl">
            {levelEmoji[profile?.level]}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-text">{profile?.full_name}</h2>
            <p className="text-text-muted text-sm">{profile?.phone}</p>
            <span className={`badge mt-1 ${profile?.level === 'core' ? 'bg-warning/20 text-warning' : profile?.level === 'verified' ? 'bg-accent/20 text-accent' : 'bg-border text-text-muted'}`}>
              {levelLabel[profile?.level]}
            </span>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${profile?.points < 0 ? 'text-danger' : 'text-accent'}`}>{profile?.points}</p>
            <p className="text-text-muted text-xs">pontos</p>
            {profile?.points < 0 && <p className="text-xs text-warning mt-1">⚠️ Recuperação</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent">{attendanceRate}%</p>
          <p className="text-text-muted text-xs mt-1">Presença</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-text">{stats.total}</p>
          <p className="text-text-muted text-xs mt-1">Jogos</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-warning">{stats.streak}🔥</p>
          <p className="text-text-muted text-xs mt-1">Sequência</p>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="card mb-4">
          <p className="text-sm text-text-muted mb-3">Evolução de pontos</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="day" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#2d2d2d', border: '1px solid #404040', borderRadius: '8px', color: '#e0e0e0' }}
                formatter={(v) => [`${v} pts`, 'Pontos']}
                labelFormatter={() => ''}
              />
              <Line type="monotone" dataKey="points" stroke="#00ff88" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {history.length > 0 && (
        <div className="card mb-4">
          <p className="text-sm text-text-muted mb-3">Histórico recente</p>
          <div className="flex flex-col gap-2">
            {history.slice(0, 5).map(h => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-text">{h.reason}</p>
                  <p className="text-xs text-text-muted">{h.matches?.date ? format(parseISO(h.matches.date), "dd MMM", { locale: ptBR }) : ''}</p>
                </div>
                <span className={`font-bold text-sm ${h.points_change > 0 ? 'text-accent' : 'text-danger'}`}>
                  {h.points_change > 0 ? '+' : ''}{h.points_change}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={signOut} className="btn-secondary w-full">Sair da conta</button>
    </div>
  )
}
