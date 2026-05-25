import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function CreateMatchModal({ onClose, onCreated }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ date: '', time: '20:00', location: '', max_players: 10 })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('matches').insert({
      ...form,
      max_players: Number(form.max_players),
      status: 'open',
      created_by: profile.id,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Jogo criado!')
      onCreated()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-t-3xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-text mb-4">Criar Novo Jogo</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-text-muted mb-1 block">Data</label>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm text-text-muted mb-1 block">Horário</label>
            <input
              className="input"
              type="time"
              value={form.time}
              onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm text-text-muted mb-1 block">Local</label>
            <input
              className="input"
              type="text"
              placeholder="Arena Futsal, Quadra 3..."
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm text-text-muted mb-1 block">Máximo de jogadores</label>
            <input
              className="input"
              type="number"
              min={4}
              max={30}
              value={form.max_players}
              onChange={e => setForm(p => ({ ...p, max_players: e.target.value }))}
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Criando...' : 'Criar Jogo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MatchAdminCard({ match, onUpdate }) {
  const [participants, setParticipants] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (expanded) fetchParticipants()
  }, [expanded])

  async function fetchParticipants() {
    const { data } = await supabase
      .from('match_participants')
      .select('*, profiles(id, full_name, points, level)')
      .eq('match_id', match.id)
      .order('created_at')
    setParticipants(data || [])
  }

  async function approveParticipant(participantId) {
    const { error } = await supabase
      .from('match_participants')
      .update({ status: 'confirmed', responded_at: new Date().toISOString() })
      .eq('id', participantId)
    if (error) toast.error(error.message)
    else { toast.success('Aprovado!'); fetchParticipants() }
  }

  async function rejectParticipant(participantId) {
    const { error } = await supabase
      .from('match_participants')
      .update({ status: 'cancelled' })
      .eq('id', participantId)
    if (error) toast.error(error.message)
    else { toast.success('Rejeitado'); fetchParticipants() }
  }

  async function markNoShow(participantId) {
    const { error } = await supabase
      .from('match_participants')
      .update({ status: 'no_show' })
      .eq('id', participantId)
    if (error) toast.error(error.message)
    else fetchParticipants()
  }

  async function closeMatch() {
    setLoading(true)
    const { error } = await supabase.from('matches').update({ status: 'closed' }).eq('id', match.id)
    if (error) toast.error(error.message)
    else { toast.success('Convocações encerradas'); onUpdate() }
    setLoading(false)
  }

  async function completeMatch() {
    setLoading(true)
    const { error } = await supabase.from('matches').update({ status: 'completed' }).eq('id', match.id)
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const confirmed = participants.filter(p => p.status === 'confirmed')
    const noShows = participants.filter(p => p.status === 'no_show')

    const pointUpdates = [
      ...confirmed.map(p => ({
        user_id: p.user_id,
        match_id: match.id,
        points_change: 5,
        reason: 'Presença confirmada e realizada',
      })),
      ...noShows.map(p => ({
        user_id: p.user_id,
        match_id: match.id,
        points_change: -8,
        reason: 'Falta sem aviso',
      })),
    ]

    if (pointUpdates.length > 0) {
      await supabase.from('point_history').insert(pointUpdates)
      for (const upd of pointUpdates) {
        await supabase.rpc('increment_points', { user_id: upd.user_id, delta: upd.points_change })
      }
    }

    toast.success('Jogo finalizado e pontos calculados!')
    onUpdate()
    setLoading(false)
  }

  const confirmed = participants.filter(p => p.status === 'confirmed')
  const pending = participants.filter(p => p.status === 'pending')
  const dateStr = format(parseISO(match.date), 'dd/MM/yyyy', { locale: ptBR })

  return (
    <div className="card">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <p className="font-semibold text-text">{dateStr} · {match.time?.slice(0, 5)}h</p>
          <p className="text-text-muted text-sm">{match.location}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`badge text-xs ${
              match.status === 'open' ? 'bg-accent/20 text-accent' :
              match.status === 'closed' ? 'bg-warning/20 text-warning' :
              'bg-border text-text-muted'
            }`}>
              {match.status === 'open' ? 'Aberto' : match.status === 'closed' ? 'Fechado' : 'Realizado'}
            </span>
            <span className="text-text-muted text-xs">{confirmed.length}/{match.max_players} confirmados</span>
            {pending.length > 0 && (
              <span className="badge bg-warning/20 text-warning text-xs">{pending.length} pendentes</span>
            )}
          </div>
        </div>
        <span className="text-text-muted text-sm">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-3">
          {confirmed.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-2 font-semibold uppercase tracking-wide">
                Confirmados ({confirmed.length})
              </p>
              <div className="flex flex-col gap-1">
                {confirmed.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 px-2 bg-bg rounded-lg">
                    <div>
                      <span className="text-sm text-text">{p.profiles?.full_name}</span>
                      <span className={`ml-2 text-xs ${(p.profiles?.points ?? 0) < 0 ? 'text-danger' : 'text-accent'}`}>
                        {p.profiles?.points}pts
                      </span>
                    </div>
                    {match.status === 'closed' && (
                      <button
                        onClick={() => markNoShow(p.id)}
                        className="text-xs text-danger border border-danger/30 rounded px-2 py-1"
                      >
                        No-show
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-2 font-semibold uppercase tracking-wide">
                Aguardando aprovação ({pending.length})
              </p>
              <div className="flex flex-col gap-2">
                {pending.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-2 bg-bg rounded-lg">
                    <div>
                      <span className="text-sm text-text">{p.profiles?.full_name}</span>
                      <span className={`ml-2 text-xs ${(p.profiles?.points ?? 0) < 0 ? 'text-danger' : 'text-text-muted'}`}>
                        {p.profiles?.points}pts
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => rejectParticipant(p.id)}
                        className="text-xs text-danger border border-danger/30 rounded px-2 py-1"
                      >
                        ✗
                      </button>
                      <button
                        onClick={() => approveParticipant(p.id)}
                        className="text-xs text-accent border border-accent/30 rounded px-2 py-1"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {match.status !== 'completed' && (
            <div className="flex gap-2 pt-2 border-t border-border">
              {match.status === 'open' && (
                <button onClick={closeMatch} disabled={loading} className="btn-secondary text-sm py-2 flex-1">
                  Fechar Convocações
                </button>
              )}
              <button onClick={completeMatch} disabled={loading} className="btn-primary text-sm py-2 flex-1">
                ✓ Marcar Realizado
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ManageMatchesPage() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchMatches()
  }, [])

  async function fetchMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)
    setMatches(data || [])
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text">Jogos</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2 px-4">
          + Criar Jogo
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <div className="text-4xl mb-3">🏟️</div>
          <p>Nenhum jogo criado ainda</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map(match => (
            <MatchAdminCard key={match.id} match={match} onUpdate={fetchMatches} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateMatchModal onClose={() => setShowCreate(false)} onCreated={fetchMatches} />
      )}
    </div>
  )
}
