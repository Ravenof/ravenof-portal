'use client'

import { useState, useTransition } from 'react'
import { resolveDisputedMatch } from '@/app/admin/events/actions'

type Player = {
  id: string
  seed: number | null
  display_name?: string | null
  username?: string
}

type DisputedMatch = {
  id: string
  match_number: number
  player1: Player | null
  player2: Player | null
}

type Props = {
  matches: DisputedMatch[]
}

function PlayerName(p: Player | null) {
  if (!p) return '—'
  const name = p.display_name || p.username || '???'
  return p.seed ? `[Poz. ${p.seed}] ${name}` : name
}

export function DisputedMatchAdmin({ matches }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  if (matches.length === 0) return null

  const resolve = (matchId: string, winnerId: string) => {
    setErrors(e => { const n = { ...e }; delete n[matchId]; return n })
    startTransition(async () => {
      const res = await resolveDisputedMatch(matchId, winnerId)
      if (res.error) {
        setErrors(e => ({ ...e, [matchId]: res.error! }))
      } else {
        setResolved(s => new Set(s).add(matchId))
      }
    })
  }

  return (
    <div className="space-y-3">
      {matches.map(m => {
        if (resolved.has(m.id)) {
          return (
            <div key={m.id} className="rounded-xl px-4 py-3 text-sm"
              style={{ background: '#a78bfa15', border: '1px solid #a78bfa40', color: '#a78bfa' }}>
              ✓ Mačas #{m.match_number} — sprendimas priimtas
            </div>
          )
        }
        return (
          <div key={m.id} className="rounded-xl p-4 space-y-3"
            style={{ background: '#ef444410', border: '1px solid #ef444460' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: '#ef444430', color: '#ef4444' }}>
                ⚠ GINČAS
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Mačas #{m.match_number}
              </span>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{PlayerName(m.player1)}</span>
              <span className="mx-2" style={{ color: 'var(--text-muted)' }}>vs</span>
              <span style={{ color: 'var(--text-primary)' }}>{PlayerName(m.player2)}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Abu žaidėjai pateikė prieštaringus rezultatus. Paskirkite pergalę:
            </p>
            <div className="flex gap-2 flex-wrap">
              {m.player1 && (
                <button
                  onClick={() => resolve(m.id, m.player1!.id)}
                  disabled={isPending}
                  className="flex-1 rounded-lg py-2 px-3 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: '#14532d', color: '#86efac', border: '1px solid #22c55e40', minWidth: '120px' }}>
                  🏆 Pergalė: {m.player1.display_name || m.player1.username || 'Žaidėjas 1'}
                </button>
              )}
              {m.player2 && (
                <button
                  onClick={() => resolve(m.id, m.player2!.id)}
                  disabled={isPending}
                  className="flex-1 rounded-lg py-2 px-3 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: '#14532d', color: '#86efac', border: '1px solid #22c55e40', minWidth: '120px' }}>
                  🏆 Pergalė: {m.player2.display_name || m.player2.username || 'Žaidėjas 2'}
                </button>
              )}
            </div>
            {errors[m.id] && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{errors[m.id]}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
