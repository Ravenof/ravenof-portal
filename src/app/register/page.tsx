'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [username, setUsername]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  const handleUsernameChange = (v: string) => {
    setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))
  }

  const validate = (): string | null => {
    if (!USERNAME_RE.test(username))
      return 'Username gali turėti tik mažąsias raides, skaičius ir _ (3–20 simbolių)'
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

    // Check username uniqueness (visible profiles only — private profiles checked by trigger)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      setError('Šis username jau užimtas')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username },
      },
    })

    setLoading(false)

    if (signUpError) {
      // Map common Supabase error codes to Lithuanian messages
      const msg = signUpError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email address is already')) {
        setError('Šis el. paštas jau užregistruotas. Prisijunk arba naudok kitą.')
      } else if (msg.includes('database error') || msg.includes('saving new user')) {
        setError('Registracijos klaida (duomenų bazės problema). Bandyk dar kartą arba susisiek su administracija.')
      } else if (msg.includes('password')) {
        setError('Slaptažodis per silpnas. Naudok bent 8 simbolius.')
      } else if (msg.includes('email')) {
        setError('Neteisingas el. pašto formatas.')
      } else {
        setError(signUpError.message)
      }
      return
    }

    // If user has no session after signUp — email confirmation is required
    if (data?.user && !data.session) {
      setNeedsConfirm(true)
      return
    }

    // Session exists — logged in immediately (email confirmation disabled)
    setDone(true)
    setTimeout(() => {
      router.push('/cards')
      router.refresh()
    }, 1500)
  }

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--bg-border)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  if (needsConfirm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-4xl">📧</div>
          <p className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}>
            Patvirtink el. paštą
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Išsiuntėme patvirtinimo nuorodą į <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            Spustelėk nuorodą laiške ir grįžk prisijungti.
          </p>
          <a href="/login"
            className="inline-block mt-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: 'var(--gold)' }}>
            Prisijungti →
          </a>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center space-y-3">
          <div className="text-4xl">✅</div>
          <p style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}>Paskyra sukurta!</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nukreipiama...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm rounded-xl p-8 space-y-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>

        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-widest"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            RAVENOF
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Registracija</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username (a-z, 0-9, _)"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              required
              maxLength={20}
              autoComplete="username"
              style={inputStyle}
            />
            {username.length > 0 && !USERNAME_RE.test(username) && (
              <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                3–20 simbolių, tik a–z, 0–9, _
              </p>
            )}
          </div>

          <input
            type="email"
            placeholder="El. paštas"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Slaptažodis (min. 8 simboliai)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            style={inputStyle}
          />

          <div>
            <input
              type="password"
              placeholder="Pakartoti slaptažodį"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              style={{
                ...inputStyle,
                borderColor: confirm && confirm !== password ? '#ef4444' : 'var(--bg-border)',
              }}
            />
            {confirm && confirm !== password && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Slaptažodžiai nesutampa</p>
            )}
          </div>

          {error && <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}
          >
            {loading ? 'Kuriama paskyra...' : 'Registruotis'}
          </button>
        </form>

        <div className="text-center space-y-2">
          <a href="/login" className="block text-sm transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}>
            Jau turi paskyrą? <span style={{ color: 'var(--gold)' }}>Prisijungti</span>
          </a>
          <a href="/cards" className="block text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            ← Grįžti į kortų bazę
          </a>
        </div>
      </div>
    </div>
  )
}
