'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'

export default function ChangePasswordPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

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

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/profile/settings" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Nustatymai
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-semibold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Keisti slaptažodį
          </span>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4 py-12">
        {done ? (
          <div className="rounded-xl p-8 text-center space-y-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: '#22c55e20' }}>
              <Check className="w-6 h-6" style={{ color: '#22c55e' }} />
            </div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Slaptažodis sėkmingai pakeistas!
            </p>
            <button
              onClick={() => router.push('/me')}
              className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--gold)', color: '#0a0a0f', fontWeight: 600 }}
            >
              Grįžti į profilį
            </button>
          </div>
        ) : (
          <div className="rounded-xl p-8 space-y-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>
              Keisti slaptažodį
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Naujas slaptažodis
                </label>
                <input
                  type="password"
                  placeholder="Min. 8 simboliai"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Pakartoti slaptažodį
                </label>
                <input
                  type="password"
                  placeholder="Pakartoti naują slaptažodį"
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

              {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}

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
        )}
      </div>
    </div>
  )
}
