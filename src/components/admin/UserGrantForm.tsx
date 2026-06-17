'use client'

// ── Admin: skirti auksą / pakuotes vartotojui ────────────────────────────────
import { useState, useTransition } from 'react'
import { adminGiveGold, adminGivePacks } from '@/app/admin/users/actions'

export function UserGrantForm({ userId, gold }: { userId: string; gold: number }) {
  const [g, setG] = useState(100)
  const [p, setP] = useState(1)
  const [cur, setCur] = useState(gold)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const inputStyle = { width: 56 } as React.CSSProperties
  const btn = (bg: string, bd: string, col: string) => ({ background: bg, border: '1px solid ' + bd, color: col }) as React.CSSProperties

  return (
    <div className="flex flex-col gap-1 min-w-[170px]">
      <span className="text-[11px] font-bold" style={{ color: 'var(--gold)' }}>🪙 {cur.toLocaleString('lt-LT')}</span>
      <div className="flex items-center gap-1">
        <input type="number" value={g} onChange={(e) => setG(Number(e.target.value))} style={inputStyle}
          className="px-1 py-0.5 text-xs rounded bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--text-primary)]" />
        <button type="button" disabled={pending}
          onClick={() => start(async () => { const r = await adminGiveGold(userId, g); setMsg(r.error ?? 'Pridėta'); if (r.gold != null) setCur(r.gold) })}
          className="text-[11px] px-2 py-0.5 rounded disabled:opacity-40" style={btn('rgba(240,180,41,0.18)', 'rgba(240,180,41,0.4)', 'var(--gold)')}>
          + auksas
        </button>
      </div>
      <div className="flex items-center gap-1">
        <input type="number" value={p} onChange={(e) => setP(Number(e.target.value))} style={inputStyle}
          className="px-1 py-0.5 text-xs rounded bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--text-primary)]" />
        <button type="button" disabled={pending}
          onClick={() => start(async () => { const r = await adminGivePacks(userId, p); setMsg(r.error ?? 'Pakuotės pridėtos') })}
          className="text-[11px] px-2 py-0.5 rounded disabled:opacity-40" style={btn('rgba(251,146,60,0.18)', 'rgba(251,146,60,0.4)', '#fdba74')}>
          + pakuotės
        </button>
      </div>
      {msg && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{msg}</span>}
    </div>
  )
}
