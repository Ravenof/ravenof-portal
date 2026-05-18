'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Neteisingas el. paštas arba slaptažodis.')
    } else {
      const sp = new URLSearchParams(window.location.search)
      const next = sp.get('next') ?? sp.get('redirectTo') ?? '/cards'
      router.push(next)
      router.refresh()
    }
    setLoading(false)
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
        className="w-full max-w-sm rounded-2xl p-8 space-y-7 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.07) 0%, var(--bg-surface) 60%)',
          border:     '1px solid rgba(124,58,237,0.2)',
          boxShadow:  '0 0 40px rgba(124,58,237,0.1), 0 0 80px rgba(0,0,0,0.4)',
        }}
      >
        <div className="text-center space-y-1 pt-2">
          <h1 className="rvn-page-title text-3xl tracking-widest">RAVENOF</h1>
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.2em' }}
          >
            Prisijungimas
          </p>
        </div>

        <div className="rvn-divider-gold" />

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
              El. paštas
            </label>
            <input
              type="email"
              placeholder="jusu@pastas.lt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rvn-input"
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
              Slaptažodis
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="rvn-input"
            />
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-2.5 text-sm text-center"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(240,180,41,0.25)] active:scale-[0.98] disabled:opacity-50"
            style={{
              background:    'linear-gradient(135deg,#92400e,#b45309)',
              color:         'var(--gold)',
              border:        '1px solid rgba(240,180,41,0.35)',
              fontFamily:    'var(--rvn-font-display)',
              letterSpacing: '0.06em',
            }}
          >
            {loading ? 'Jungiamasi...' : 'Prisijungti'}
          </button>

          <div className="text-center">
            <a href="/forgot-password" className="text-xs transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}>
              Pamirštai slaptažodį?
            </a>
          </div>
        </form>

        <div className="rvn-divider" />

        <div className="text-center space-y-2">
          <a
            href="/register"
            className="block text-sm transition-opacity hover:opacity-90"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', fontSize: '12px', letterSpacing: '0.04em' }}
          >
            Neturi paskyros?{' '}
            <span style={{ color: 'var(--gold)' }}>Registruotis</span>
          </a>
          <a href="/cards" className="block text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
            Grižti į kortų bazę
          </a>
        </div>
      </div>
    </div>
  )
}
