import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const levelLabel = { candidate: 'Candidato', verified: 'Verificado', core: 'Admin' }
const levelColor = { candidate: 'text-text-muted', verified: 'text-accent', core: 'text-warning' }

export default function RankingPage() {
  const { profile } = useAuth()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRanking()
  }, [])

  async function fetchRanking() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, points, level')
      .eq('is_banned', false)
      .order('points', { ascending: false })
      .limit(50)
    setPlayers(data || [])
    setLoading(false)
  }

  const top10 = players.slice(0, 10)
  const myRank = players.findIndex(p => p.id === profile?.id) + 1
  const myData = players.find(p => p.id === profile?.id)
  const inTop10 = myRank > 0 && myRank <= 10

  function RankRow({ player, rank, isMe }) {
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isMe ? 'bg-accent/10 border border-accent/30' : 'hover:bg-card-hover'}`}>
        <div className="w-8 text-center">
          {medal ? <span className="text-xl">{medal}</span> : <span className="text-text-muted font-mono text-sm">#{rank}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${isMe ? 'text-accent' : 'text-text'}`}>
            {player.full_name} {isMe ? '(você)' : ''}
          </p>
          <p className={`text-xs ${levelColor[player.level]}`}>{levelLabel[player.level]}</p>
        </div>
        <div className="text-right">
          <p className={`font-bold ${player.points < 0 ? 'text-danger' : 'text-accent'}`}>{player.points}</p>
          <p className="text-text-muted text-xs">pts</p>
        </div>
        {player.points < 0 && <span className="text-xs">⚠️</span>}
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-text mb-2">Ranking</h1>
      <p className="text-text-muted text-sm mb-6">Top jogadores por pontuação</p>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col gap-1">
          {top10.map((player, i) => (
            <RankRow key={player.id} player={player} rank={i + 1} isMe={player.id === profile?.id} />
          ))}
        </div>
      )}

      {!inTop10 && myData && (
        <div className="mt-4">
          <p className="text-text-muted text-xs mb-2 text-center">Sua posição</p>
          <div className="card">
            <RankRow player={myData} rank={myRank} isMe={true} />
          </div>
        </div>
      )}

      {!inTop10 && !myData && !loading && (
        <div className="mt-4 card text-center py-4">
          <p className="text-text-muted text-sm">Jogue sua primeira partida para aparecer no ranking!</p>
        </div>
      )}
    </div>
  )
}
