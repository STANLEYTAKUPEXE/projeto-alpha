import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function StatsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const [
      { count: totalMatches },
      { data: topPlayers },
      { data: recovering },
      { count: totalUsers },
      { count: verifiedUsers },
    ] = await Promise.all([
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase
        .from('profiles')
        .select('id, full_name, points, level')
        .eq('is_banned', false)
        .order('points', { ascending: false })
        .limit(5),
      supabase
        .from('profiles')
        .select('id, full_name, points')
        .lt('points', 0)
        .eq('is_banned', false)
        .order('points', { ascending: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('level', ['verified', 'core']),
    ])

    setStats({
      totalMatches: totalMatches || 0,
      topPlayers: topPlayers || [],
      recovering: recovering || [],
      totalUsers: totalUsers || 0,
      verifiedUsers: verifiedUsers || 0,
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-card rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-text">Estatísticas</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-accent">{stats.totalMatches}</p>
          <p className="text-text-muted text-xs mt-1">Jogos realizados</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-text">{stats.totalUsers}</p>
          <p className="text-text-muted text-xs mt-1">Jogadores</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-accent">{stats.verifiedUsers}</p>
          <p className="text-text-muted text-xs mt-1">Verificados</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${stats.recovering.length > 0 ? 'text-danger' : 'text-text'}`}>
            {stats.recovering.length}
          </p>
          <p className="text-text-muted text-xs mt-1">Em recuperação</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-text mb-3">🏆 Mais Confiáveis (Top 5)</h3>
        {stats.topPlayers.length === 0 ? (
          <p className="text-text-muted text-sm">Nenhum jogador ainda</p>
        ) : (
          <div className="flex flex-col gap-2">
            {stats.topPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-text-muted w-5 text-sm">{i + 1}.</span>
                <span className="flex-1 text-text text-sm truncate">{p.full_name}</span>
                <span className={`font-bold text-sm ${p.points < 0 ? 'text-danger' : 'text-accent'}`}>
                  {p.points} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats.recovering.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-text mb-3">
            ⚠️ Em Recuperação ({stats.recovering.length})
          </h3>
          <div className="flex flex-col gap-2">
            {stats.recovering.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-text text-sm">{p.full_name}</span>
                <span className="text-danger font-bold text-sm">{p.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
