'use client'

import { useState, useTransition } from 'react'
import { changeUsername } from '@/app/profile/settings/changeUsername'
import { RavenofButton } from '@/components/ui/RavenofButton'

type Props = {
  currentUsername: string
  /** ISO string of last change, or null if never changed */
  usernameChangedAt: string | null
}

function canChangeUsername(usernameChangedAt: string | null): { allowed: boolean; nextDate: string | null } {
  if (!usernameChangedAt) return { allowed: true, nextDate: null }
  const lastChange = new Date(usernameChangedAt)
  const nextChange = new Date(lastChange)
  nextChange.setDate(nextChange.getDate() + 30)
  const allowed = Date.now() >= nextChange.getTime()
  return {
    allowed,
    nextDate: allowed ? null : nextChange.toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' }),
  }
}

export function UsernameChangeForm({ currentUsername, usernameChangedAt }: Props) {
  const { allowed, nextDate } = canChangeUsername(usernameChangedAt)
  const [value, setValue] = useState(currentUsername)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDirty = value.trim().toLowerCase() !== currentUsername
  const canSubmit = isDirty && allowed && !isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setResult(null)
    startTransition(async () => {
      const res = await changeUsername(value)
      if ('error' in res) {
        setResult({ error: res.error })
      } else {
        setResult({ success: true })
        setValue(res.newUsername)
      }
    })
  }

  return (
    <div className="rvn-panel space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2
          className="rvn-section-title text-xs uppercase tracking-widest"
        >
          Vartotojo vardas
        </h2>
        <div className="flex-1 rvn-divider" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input */}
        <div className="space-y-1">
          <label
            htmlFor="username-input"
            className="block text-xs font-medium"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}
          >
            Vartotojo vardas
          </label>
          <input
            id="username-input"
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setResult(null) }}
            disabled={!allowed || isPending}
            maxLength={24}
            placeholder="tavo_vardas"
            className="rvn-input w-full"
            style={!allowed ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Galimi simboliai: a–z, 0–9, _ &nbsp;·&nbsp; Min. 3, max. 24
          </p>
        </div>

        {/* Cooldown notice */}
        {!allowed && nextDate && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{
              background: 'rgba(240,180,41,0.08)',
              border:     '1px solid rgba(240,180,41,0.2)',
              color:      'var(--text-muted)',
            }}
          >
            <span className="text-base">⏳</span>
            <span>
              Vartotojo vardą galima keisti tik kartą per 30 dienų.{' '}
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                Vėl galėsite keisti: {nextDate}
              </span>
            </span>
          </div>
        )}

        {/* Helper text when allowed */}
        {allowed && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Vartotojo vardą galima keisti kartą per 30 dienų. Senas vardas rodomas viešai 30 dienų.
          </p>
        )}

        {/* Feedback */}
        {result?.error && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}
          >
            {result.error}
          </p>
        )}
        {result?.success && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', color: '#86efac' }}
          >
            ✓ Vartotojo vardas pakeistas.
          </p>
        )}

        {/* Submit */}
        <RavenofButton
          type="submit"
          variant={canSubmit ? 'gold' : 'secondary'}
          size="md"
          disabled={!canSubmit}
          fullWidth
        >
          {isPending ? 'Keičiama...' : 'Keisti vartotojo vardą'}
        </RavenofButton>
      </form>
    </div>
  )
}
