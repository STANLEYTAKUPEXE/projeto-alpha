import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const levelOptions = ['candidate', 'verified', 'core']
const levelLabel = { candidate: 'Candidato', verified: 'Verificado', core: 'Admin' }

export default function ManageUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [editUser, setEditUser] = useState(null)
  const [pointAdjust, setPointAdjust] = useState({ delta: '', reason: '' })

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function updateLevel(userId, level) {
    const { error } = await supabase.from('profiles').update({ level }).eq('id', userId)
    if (error) toast.error(error.message)
    else { toast.success('Nível atualizado!'); fetchUsers() }
  }

  async function toggleBan(userId, currentBan) {
    const { error } = await supabase.from('profiles').update({ is_banned: !currentBan }).eq('id', userId)
    if (error) toast.error(error.message)
    else { toast.success(currentBan ? 'Banimento removido' : 'Usuário banido'); fetchUsers() }
  }

  async function applyPointAdjust() {
    if (!pointAdjust.reason.trim()) { toast.error('Motivo obrigatório'); return }
    const delta = Number(pointAdjust.delta)
    if (isNaN(delta) || delta === 0) { toast.error('Insira um valor válido'); return }

    const [{ error: histError }, { error: profileError }] = await Promise.all([
      supabase.from('point_history').insert({
        user_id: editUser.id,
        match_id: null,
        points_change: delta,
        reason: pointAdjust.reason,
      }),
      supabase.rpc('increment_points', { user_id: editUser.id, delta }),
    ])

    if (histError || profileError) {
      toast.error('Erro ao ajustar pontos')
    } else {
      toast.success('Pontos ajustados!')
      setEditUser(null)
      setPointAdjust({ delta: '', reason: '' })
      fetchUsers()
    }
  }

  const filtered = users.filter(u => {
    const matchSearch =
      search === '' ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
    const matchFilter =
      filter === 'all' ||
      (filter === 'negative' && u.points < 0) ||
      (filter === 'verified' && u.level === 'verified') ||
      (filter === 'candidate' && u.level === 'candidate')
    return matchSearch && matchFilter
  })

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-4">Usuários</h2>

      <div className="flex flex-col gap-3 mb-4">
        <input
          className="input"
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            ['all', 'Todos'],
            ['candidate', 'Candidatos'],
            ['verified', 'Verificados'],
            ['negative', 'Negativos'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === val
                  ? 'bg-accent text-bg'
                  : 'bg-card text-text-muted border border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <p>Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(user => (
            <div key={user.id} className={`card ${user.is_banned ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text truncate">{user.full_name}</p>
                  <p className="text-text-muted text-xs">{user.phone}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`badge text-xs ${
                      user.level === 'core' ? 'bg-warning/20 text-warning' :
                      user.level === 'verified' ? 'bg-accent/20 text-accent' :
                      'bg-border text-text-muted'
                    }`}>
                      {levelLabel[user.level]}
                    </span>
                    <span className={`text-sm font-bold ${user.points < 0 ? 'text-danger' : 'text-accent'}`}>
                      {user.points} pts
                    </span>
                    {user.points < 0 && <span className="text-xs">⚠️</span>}
                    {user.is_banned && (
                      <span className="badge bg-danger/20 text-danger text-xs">BANIDO</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <select
                    value={user.level}
                    onChange={e => updateLevel(user.id, e.target.value)}
                    className="bg-bg border border-border rounded-lg px-2 py-1 text-xs text-text"
                  >
                    {levelOptions.map(l => (
                      <option key={l} value={l}>{levelLabel[l]}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditUser(user); setPointAdjust({ delta: '', reason: '' }) }}
                      className="text-xs border border-border rounded px-2 py-1 text-text-muted"
                    >
                      Pts
                    </button>
                    <button
                      onClick={() => toggleBan(user.id, user.is_banned)}
                      className={`text-xs border rounded px-2 py-1 ${
                        user.is_banned
                          ? 'border-accent/30 text-accent'
                          : 'border-danger/30 text-danger'
                      }`}
                    >
                      {user.is_banned ? 'Desbanir' : 'Banir'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editUser && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end justify-center z-50"
          onClick={() => setEditUser(null)}
        >
          <div
            className="bg-card rounded-t-3xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-text mb-1">Ajuste de pontos</h3>
            <p className="text-text-muted text-sm mb-4">
              {editUser.full_name} · {editUser.points} pts atual
            </p>
            <div className="flex flex-col gap-3">
              <input
                className="input"
                type="number"
                placeholder="+5 ou -10"
                value={pointAdjust.delta}
                onChange={e => setPointAdjust(p => ({ ...p, delta: e.target.value }))}
              />
              <input
                className="input"
                type="text"
                placeholder="Motivo (obrigatório)"
                value={pointAdjust.reason}
                onChange={e => setPointAdjust(p => ({ ...p, reason: e.target.value }))}
              />
              <div className="flex gap-3">
                <button onClick={() => setEditUser(null)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button onClick={applyPointAdjust} className="btn-primary flex-1">
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
