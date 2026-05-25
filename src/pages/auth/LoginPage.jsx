import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [step, setStep] = useState('phone') // phone | otp | name
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  async function handleSendOTP(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    const formatted = phone.startsWith('+') ? phone : `+55${phone.replace(/\D/g, '')}`
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Código enviado!')
      setPhone(formatted)
      setStep('otp')
    }
    setLoading(false)
  }

  async function handleVerifyOTP(e) {
    e.preventDefault()
    if (!otp.trim()) return
    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    const userId = data.user?.id
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single()
    if (!profile) {
      setIsNewUser(true)
      setStep('name')
    }
    setLoading(false)
  }

  async function handleCreateProfile(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: name.trim(),
      phone: phone,
      level: 'candidate',
      points: 0,
    })
    if (error) {
      toast.error('Erro ao criar perfil')
    } else {
      toast.success('Bem-vindo!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-3xl font-bold text-text">Futsal Manager</h1>
          <p className="text-text-muted mt-2">Gestão do seu jogo semanal</p>
        </div>

        <div className="card">
          {step === 'phone' && (
            <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-text-muted mb-2 block">Número de telefone</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
                <p className="text-xs text-text-muted mt-1">Código DDI +55 será adicionado automaticamente</p>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Código SMS'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-text-muted mb-2 block">Código SMS</label>
                <input
                  className="input text-center text-2xl tracking-widest"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Verificando...' : 'Confirmar'}
              </button>
              <button type="button" className="text-text-muted text-sm text-center" onClick={() => setStep('phone')}>
                Voltar
              </button>
            </form>
          )}

          {step === 'name' && (
            <form onSubmit={handleCreateProfile} className="flex flex-col gap-4">
              <div>
                <p className="text-accent font-semibold mb-4">Primeiro acesso! Qual seu nome?</p>
                <label className="text-sm text-text-muted mb-2 block">Nome completo</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Criando perfil...' : 'Entrar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
