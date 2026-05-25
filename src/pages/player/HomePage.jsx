import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function MatchCard({ match, onAction }) {
  const { profile } = useAuth()
  const [participation, setParticipation] = useState(null)
  const [confirmed, setConfirmed] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel(`match-${match.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_participants', filter: `match_id=eq.${match.id}` }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [match.id])

  async function fetchData() {
    const [{ data: part }, { count }] = await Promise.all([
      supabase.from('match_participants').select('*').eq('match_id', match.id).eq('user_id', profile.id).single(),
      supabase.from('match_participants').select('*', { count: 'exact', head: true }).eq('match_id', match.id).eq('status', 'confirmed'),
    ])
    setParticipation(part)
    setConfirmed(count || 0)
  }

  async function handleAction() {
    setLoading(true)
    try {
      if (participation) {
        if (participation.status === 'confirmed' || participation.status === 'pending') {
          const { error } = await supabase.from('match_participants').update({ status: 'cancelled', responded_at: new Date().toISOString() }).eq('id', participation.id)
          if (error) throw error
          toast.success('Presença cancelada')
        }
      } else {
        const status = profile.level === 'candidate' ? 'pending' : 'confirmed'
        const { error } = await supabase.from('match_participants').insert({
          match_id: match.id,
          user_id: profile.id,
          status,
          notified_at: new Date().toISOString(),
          responded_at: new Date().toISOString(),
        })
        if (error) throw error
        toast.success(status === 'confirmed' ? 'Presença confirmada!' : 'Interesse registrado!')
      }
      await fetchData()
      onAction?.()
    } catch (err) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  const spotsLeft = match.max_players - confirmed
  const isLowPriority = profile.points < 0
  const isFull = spotsLeft <= 0

  const matchDate = parseISO(match.date)
  const dateStr = format(matchDate, "EEE, dd 'de' MMMM", { locale: ptBR })

  let statusBadge = null
  let actionBtn = null

  if (participation?.status === 'confirmed') {
    statusBadge = <span className="badge bg-accent/20 text-accent">✓ Confirmado</span>
    actionBtn = <button onClick={handleAction} disabled={loading} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
  } else if (participation?.status === 'pending') {
    statusBadge = <span className="badge bg-warning/20 text-warning">⏳ Aguardando aprovação</span>
    actionBtn = <button onClick={handleAction} disabled={loading} className="btn-secondary text-sm py-2 px-4">Cancelar interesse</button>
  } else if (participation?.status === 'cancelled') {
    statusBadge = <span className="badge bg-danger/20 text-danger">Cancelado</span>
    actionBtn = <button onClick={handleAction} disabled={loading || isFull} className="btn-secondary text-sm py-2 px-4">Reagendar</button>
  } else {
    if (profile.level === 'candidate') {
      actionBtn = <button onClick={handleAction} disabled={loading} className="btn-secondary w-full py-3">{loading ? '...' : '🙋 Tenho Interesse'}</button>
    } else {
      actionBtn = <button onClick={handleAction} disabled={loading || (isFull && isLowPriority)} className="btn-primary w-full py-3">{loading ? '...' : '✅ Confirmar Presença'}</button>
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-text capitalize">{dateStr}</p>
          <p className="text-text-muted text-sm">{match.time?.slice(0,5)}h · {match.location}</p>
        </div>
        <div className={`text-right ${spotsLeft <= 2 ? 'text-danger' : 'text-accent'}`}>
          <p className="text-xl font-bold">{confirmed}/{match.max_players}</p>
          <p className="text-xs text-text-muted">{spotsLeft > 0 ? `${spotsLeft} vagas` : 'Lotado'}</p>
        </div>
      </div>

      {statusBadge && <div>{statusBadge}</div>}

      {isLowPriority && !participation?.status && (
        <p className="text-xs text-warning bg-warning/10 rounded-lg p-2">
          ⚠️ Você está em baixa prioridade. Compareça aos jogos para recuperar pontos.
        </p>
      )}

      <div className="flex gap-2 items-center">
        <div className="flex-1">{actionBtn}</div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { profile } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMatches()
  }, [])

  async function fetchMatches() {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .in('status', ['open', 'closed'])
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
    if (!error) setMatches(data || [])
    setLoading(false)
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Próximos Jogos</h1>
          <p className="text-text-muted text-sm">Olá, {profile?.full_name?.split(' ')[0]} 👋</p>
        </div>
        <div className="text-right">
          <p className="text-accent font-bold text-xl">{profile?.points ?? 0}</p>
          <p className="text-text-muted text-xs">pontos</p>
        </div>
      </div>

      {profile?.points < 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 mb-4 flex items-center gap-2">
          <span>⚠️</span>
          <div>
            <p className="text-danger text-sm font-semibold">Modo Recuperação</p>
            <p className="text-text-muted text-xs">Compareça aos jogos confirmados para recuperar seus pontos</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2].map(i => (
            <div key={i} className="card h-36 animate-pulse bg-card-hover" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <div className="text-4xl mb-3">🏟️</div>
          <p>Nenhum jogo agendado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} onAction={fetchMatches} />
          ))}
        </div>
      )}
    </div>
  )
}
