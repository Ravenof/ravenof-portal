'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Always show success — never reveal if email exists (account enumeration prevention)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    })

    setSent(true)
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

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-sm rounded-xl p-8 space-y-4 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="text-4xl">📨</div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Laiškas išsiųstas
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Jei toks vartotojas egzistuoja, išsiuntėme slaptažodžio atkūrimo nuorodą į el. paštą.
          </p>
          <a href="/login" className="block text-sm transition-opacity hover:opacity-80 mt-4"
            style={{ color: 'var(--gold)' }}>
            ← Grįžti į prisijungimą
          </a>
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
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Slaptažodžio atkūrimas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="El. paštas"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}
          >
            {loading ? 'Siunčiama...' : 'Siųsti atkūrimo nuorodą'}
          </button>
        </form>

        <div className="text-center">
          <a href="/login" className="text-sm transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}>
            ← Grįžti į prisijungimą
          </a>
        </div>
      </div>
    </div>
  )
}
