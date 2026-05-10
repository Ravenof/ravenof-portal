'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [ready, setReady]     = useState<boolean | null>(null) // null = checking
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when user lands via reset email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Also check existing session (in case page refreshed after recovery)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else if (ready === null) setReady(false)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Slaptažodis turi būti bent 8 simbolių'); return }
    if (password !== confirm) { setError('Slaptažodžiai nesutampa'); return }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) { setError(updateError.message); return }

    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
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

  // Checking session
  if (ready === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tikrinama reset nuoroda...</p>
      </div>
    )
  }

  // Invalid / expired link
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-sm rounded-xl p-8 space-y-4 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="text-4xl">⚠️</div>
          <h2 className="font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#ef4444' }}>
            Nuoroda negalioja
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Reset nuoroda negalioja arba pasibaigė.
          </p>
          <a href="/forgot-password"
            className="inline-block text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--gold)', color: '#0a0a0f', fontWeight: 600 }}>
            Paprašyk naujos nuorodos
          </a>
        </div>
      </div>
    )
  }

  // Success
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center space-y-3">
          <div className="text-4xl">✅</div>
          <p style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}>Slaptažodis pakeistas!</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nukreipiama į prisijungimą...</p>
        </div>
      </div>
    )
  }

  // Form
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm rounded-xl p-8 space-y-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>

        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-widest"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            RAVENOF
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Naujas slaptažodis</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Naujas slaptažodis (min. 8 simboliai)"
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
            {loading ? 'Keičiama...' : 'Pakeisti slaptažodį'}
          </button>
        </form>
      </div>
    </div>
  )
}
