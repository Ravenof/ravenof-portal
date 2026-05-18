'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [username, setUsername]         = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [error, setError]               = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  const handleUsernameChange = (v: string) => {
    setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))
  }

  const validate = (): string | null => {
    if (!USERNAME_RE.test(username))
      return 'Slapyvardis: 3–20 simbolių, tik a–z, 0–9, _'
    if (password.length < 8)
      return 'Slaptažodis turi būti bent 8 simbolių'
    if (password !== confirm)
      return 'Slaptažodžiai nesutampa'
    return null
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setLoading(true)

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      setError('Šis slapyvardis jau užimtas')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: username } },
    })

    setLoading(false)

    if (signUpError) {
      const msg = signUpError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email address is already')) {
        setError('Šis el. paštas jau užregistruotas. Prisijunk arba naudok kitą.')
      } else if (msg.includes('database error') || msg.includes('saving new user')) {
        setError('Registracijos klaida. Bandyk dar kartą arba susisiek su administracija.')
      } else if (msg.includes('password')) {
        setError('Slaptažodis per silpnas. Naudok bent 8 simbolius.')
      } else if (msg.includes('email')) {
        setError('Neteisingas el. pašto formatas.')
      } else {
        setError(signUpError.message)
      }
      return
    }

    if (data?.user && !data.session) {
      setNeedsConfirm(true)
      return
    }

    setDone(true)
    setTimeout(() => {
      router.push('/cards')
      router.refresh()
    }, 1500)
  }

  if (needsConfirm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div
          className="text-center space-y-5 max-w-sm w-full rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.07) 0%, var(--bg-surface) 60%)',
            border:     '1px solid rgba(124,58,237,0.2)',
          }}
        >
          <div className="text-5xl">📧</div>
          <p className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
            Patvirtink el. paštą
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Išsiuntėme patvirtinimo nuorodą į{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            Spustelėk nuorodą laiške ir grįžk prisijungti.
          </p>
          <a href="/login" className="inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-80"
            style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
            Prisijungti
          </a>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center space-y-3">
          <div className="text-5xl">✅</div>
          <p style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>Paskyra sukurta!</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nukreipiama...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
        }} />
      </div>

      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.07) 0%, var(--bg-surface) 60%)',
          border:     '1px solid rgba(124,58,237,0.2)',
          boxShadow:  '0 0 40px rgba(124,58,237,0.1), 0 0 80px rgba(0,0,0,0.4)',
        }}
      >
        <div className="text-center space-y-1 pt-2">
          <h1 className="rvn-page-title text-3xl tracking-widest">RAVENOF</h1>
          <p className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.2em' }}>
            Registracija
          </p>
        </div>

        <div className="rvn-divider-gold" />

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div>
            <label className="block text-xs mb-1.5"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
              Slapyvardis
            </label>
            <input type="text" placeholder="a-z, 0-9, _ (3–20 simbolių)"
              value={username} onChange={(e) => handleUsernameChange(e.target.value)}
              required maxLength={20} autoComplete="username" className="rvn-input" />
            {username.length > 0 && !USERNAME_RE.test(username) && (
              <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>3–20 simbolių, tik a–z, 0–9, _</p>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1.5"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
              El. paštas
            </label>
            <input type="email" placeholder="jusu@pastas.lt"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" className="rvn-input" />
          </div>
          <div>
            <label className="block text-xs mb-1.5"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
              Slaptažodis
            </label>
            <input type="password" placeholder="Bent 8 simboliai"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8} autoComplete="new-password" className="rvn-input" />
          </div>
          <div>
            <label className="block text-xs mb-1.5"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
              Pakartoti slaptažodį
            </label>
            <input type="password" placeholder="Pakartoti slaptažodį"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              required autoComplete="new-password" className="rvn-input"
              style={{ borderColor: confirm && confirm !== password ? '#ef4444' : undefined }} />
            {confirm && confirm !== password && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Slaptažodžiai nesutampa</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl px-4 py-2.5 text-sm text-center"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(240,180,41,0.25)] active:scale-[0.98] disabled:opacity-50 mt-2"
            style={{
              background:    'linear-gradient(135deg,#92400e,#b45309)',
              color:         'var(--gold)',
              border:        '1px solid rgba(240,180,41,0.35)',
              fontFamily:    'var(--rvn-font-display)',
              letterSpacing: '0.06em',
            }}>
            {loading ? 'Kuriama paskyra...' : 'Registruotis'}
          </button>
        </form>

        <div className="rvn-divider" />

        <div className="text-center space-y-2">
          <a href="/login" className="block text-sm transition-opacity hover:opacity-90"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', fontSize: '12px', letterSpacing: '0.04em' }}>
            Jau turi paskyrą?{' '}
            <span style={{ color: 'var(--gold)' }}>Prisijungti</span>
          </a>
          <a href="/cards" className="block text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
            Grįžti į kortų bazę
          </a>
        </div>
      </div>
    </div>
  )
}
