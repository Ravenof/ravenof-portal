'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
    } else {
      // Jei email confirmation išjungtas Supabase — iškart prisijungia
      setDone(true)
      setTimeout(() => {
        router.push('/cards')
        router.refresh()
      }, 1500)
    }
    setLoading(false)
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

  if (done) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="text-center space-y-3">
          <div className="text-4xl">✅</div>
          <p style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}>
            Paskyra sukurta!
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nukreipiama į kortų bazę...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8 space-y-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
      >
        <div className="text-center space-y-1">
          <h1
            className="text-3xl font-bold tracking-widest"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
          >
            RAVENOF
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Registracija</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="email"
            placeholder="El. paštas"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Slaptažodis (min. 6 simboliai)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

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
          <a
            href="/login"
            className="block text-sm transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Jau turi paskyrą? <span style={{ color: 'var(--gold)' }}>Prisijungti</span>
          </a>
          <a
            href="/cards"
            className="block text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Grįžti į kortų bazę
          </a>
        </div>
      </div>
    </div>
  )
}
