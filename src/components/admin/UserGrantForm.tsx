'use client'

// ── Admin: greitas grantas vartotojų sąraše ──────────────────────────────────
// Sidabras / rubinai / esencija (± suma) ir XP (tik +) per adminGrantV2; pakuotės – kaip anksčiau.
import { useState, useTransition } from 'react'
import { adminGrantV2, adminGivePacks } from '@/app/admin/users/actions'

type Cur = 'silver' | 'rubies' | 'essence' | 'xp'
const DEF: Record<Cur, number> = { silver: 100, rubies: 500, essence: 50, xp: 500 }

export function UserGrantForm({ userId, gold, rubies, essence, xp, level }: {
  userId: string; gold: number; rubies: number; essence: number; xp: number; level: number
}) {
  const [kind, setKind] = useState<Cur>('rubies')
  const [g, setG] = useState(DEF.rubies)
  const [p, setP] = useState(1)
  const [bal, setBal] = useState({ silver: gold, rubies, essence })
  const [lv, setLv] = useState({ xp, level })
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const inputStyle = { width: 62 } as React.CSSProperties
  const inp = 'px-1 py-0.5 text-xs rounded bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--text-primary)]'
  const btn = (bg: string, bd: string, col: string) => ({ background: bg, border: '1px solid ' + bd, color: col }) as React.CSSProperties

  const give = () => start(async () => {
    const r = await adminGrantV2(userId, kind, null, g, null)
    if (r.error) { setMsg(r.error); return }
    if (r.balances) setBal(r.balances)
    if (r.xp != null) setLv({ xp: r.xp, level: r.level ?? lv.level })
    setMsg(g < 0 ? 'Nuimta' : 'Pridėta')
  })

  return (
    <div className="flex flex-col gap-1 min-w-[210px]">
      <span className="text-[11px] font-bold whitespace-nowrap">
        <span style={{ color: 'var(--gold)' }}>🪙 {bal.silver.toLocaleString('lt-LT')}</span>{' '}
        <span style={{ color: '#fca5a5' }}>◆ {bal.rubies.toLocaleString('lt-LT')}</span>{' '}
        <span style={{ color: '#c4b5fd' }}>✦ {bal.essence.toLocaleString('lt-LT')}</span>{' '}
        <span style={{ color: '#fde68a' }}>Lv{lv.level}</span>
      </span>
      <div className="flex items-center gap-1">
        <select value={kind} onChange={(e) => { const k = e.target.value as Cur; setKind(k); setG(DEF[k]); setMsg(null) }} className={inp}>
          <option value="silver">Sidabras</option>
          <option value="rubies">Rubinai</option>
          <option value="essence">Esencija</option>
          <option value="xp">XP</option>
        </select>
        <input type="number" value={g} onChange={(e) => setG(Number(e.target.value))} style={inputStyle} className={inp} />
        <button type="button" disabled={pending || !Number.isFinite(g) || g === 0 || (kind === 'xp' && g < 0)} onClick={give}
          className="text-[11px] px-2 py-0.5 rounded disabled:opacity-40" style={btn('rgba(240,180,41,0.18)', 'rgba(240,180,41,0.4)', 'var(--gold)')}>
          {g < 0 ? 'Nuimti' : 'Skirti'}
        </button>
      </div>
      <div className="flex items-center gap-1">
        <input type="number" value={p} onChange={(e) => setP(Number(e.target.value))} style={inputStyle} className={inp} />
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
