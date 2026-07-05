'use client'

// ── Mėnesio prisijungimo dovanų popup (30 dienų kalendorius) ─────────────────
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { getMonthlyLogin, claimMonthlyLogin, rewardChip, LT_MONTHS, type MonthlyLoginState } from '@/lib/gamification/monthlyLogin'

function fmtDur(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(h)}:${p(m)}:${p(sec)}`
}

export function MonthlyLoginModal({ onClose, onClaimed }: { onClose: () => void; onClaimed?: () => void }) {
  const [state, setState] = useState<MonthlyLoginState | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())

  const load = useCallback(() => { getMonthlyLogin().then((s) => { if (s) setState(s) }) }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const claim = useCallback(async () => {
    if (busy) return
    setBusy(true); playUiClick()
    const r = await claimMonthlyLogin()
    if (r && !('error' in r)) { playSuccess(); onClaimed?.() }
    load(); setBusy(false)
  }, [busy, load, onClaimed])

  if (typeof document === 'undefined') return null

  const d = new Date()
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
  const canClaim = !!state && !state.claimedToday && state.nextDay <= state.daysInMonth

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)', padding: 12 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 96vw)', maxHeight: '92vh', overflowY: 'auto', borderRadius: 20, padding: 18,
        background: 'radial-gradient(120% 80% at 50% 0%, rgba(240,180,41,0.12), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 18, textShadow: '0 0 18px rgba(240,180,41,0.5)' }}>
            {state ? `${LT_MONTHS[state.month - 1]} prisijungimo dovanos` : 'Prisijungimo dovanos'}
          </h2>
          <button onClick={() => { playUiClick(); onClose() }} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
        </div>

        {/* Laikmačiai */}
        <div className="flex items-center justify-between mb-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span>{state?.claimedToday ? `Kitas atlygis po ${fmtDur(nextMidnight - now)}` : 'Atlygis paruoštas!'}</span>
          <span>Reset po {Math.ceil((nextMonth - now) / 86400000)} d.</span>
        </div>

        {/* Tinklelis */}
        <div className="grid grid-cols-5 gap-1.5">
          {(state?.rewards ?? []).map((r) => {
            const claimed = state!.claimedDays.includes(r.day)
            const isNext = r.day === state!.nextDay && !state!.claimedToday && r.day <= state!.daysInMonth
            const chest = r.day === 30
            const border = claimed ? 'rgba(52,211,153,0.5)' : isNext ? 'rgba(240,180,41,0.9)' : r.milestone ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'
            const bg = claimed ? 'linear-gradient(160deg, rgba(16,40,30,0.9), rgba(9,7,15,0.9))'
              : chest ? 'radial-gradient(120% 100% at 50% 0%, rgba(240,180,41,0.28), transparent), linear-gradient(160deg, rgba(46,34,64,0.95), rgba(12,9,18,0.97))'
              : r.milestone ? 'linear-gradient(160deg, rgba(38,28,58,0.95), rgba(12,9,18,0.95))'
              : 'linear-gradient(160deg, rgba(24,18,34,0.9), rgba(10,8,16,0.95))'
            return (
              <div key={r.day} className={isNext ? 'rvn-glow-pulse' : ''} style={{ position: 'relative', borderRadius: 10, padding: '6px 3px', textAlign: 'center', minHeight: 62,
                background: bg, border: `1px solid ${border}`, opacity: !claimed && !isNext && r.day > state!.nextDay ? 0.62 : 1,
                boxShadow: isNext ? '0 0 16px rgba(240,180,41,0.4)' : 'none' }}>
                <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', color: chest ? 'var(--gold)' : r.milestone ? '#c4b5fd' : 'var(--text-muted)' }}>
                  {chest ? 'DOVANA' : `${r.day} D.`}
                </div>
                <div className="flex flex-col items-center justify-center gap-0.5 mt-0.5">
                  {r.payload.slice(0, 2).map((it, i) => { const c = rewardChip(it); return (
                    <span key={i} style={{ fontSize: 9, color: '#f3ead3', lineHeight: 1.1 }}>{c.icon}{c.label && <span style={{ fontWeight: 700 }}> {c.label}</span>}</span>
                  )})}
                </div>
                {claimed && <div style={{ position: 'absolute', top: 2, right: 3, fontSize: 11, color: '#34d399' }}>✓</div>}
              </div>
            )
          })}
        </div>

        <button onClick={claim} disabled={!canClaim || busy}
          style={{ width: '100%', marginTop: 14, padding: '13px', borderRadius: 12, fontWeight: 800, fontSize: 15, fontFamily: 'var(--rvn-font-display, Cinzel, serif)',
            cursor: canClaim && !busy ? 'pointer' : 'default',
            background: canClaim ? 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)' : 'rgba(52,211,153,0.14)',
            color: canClaim ? '#3a2406' : '#7dd3b0', border: canClaim ? '1px solid #ffeaa6' : '1px solid rgba(52,211,153,0.4)',
            boxShadow: canClaim ? 'inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 18px rgba(240,180,41,0.35)' : 'none' }}>
          {busy ? 'Skiriama…' : canClaim ? `Atsiimti ${state!.nextDay} dienos dovaną` : state?.claimedToday ? '✓ Šiandien atsiimta' : 'Mėnuo užbaigtas'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
