'use client'

// ── Mėnesio prisijungimo dovanos — landscape 3 zonų overlay ──────────────────
// kairė mėnesio progresas/laikmačiai · centras 30 d. kalendorius (6 stulpeliai)
// · dešinė šiandienos dovana + ATSIIMTI (pinned) + kitos dienos preview.
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
  const todayReward = state?.rewards.find((r) => r.day === (state.claimedToday ? Math.max(1, state.nextDay - 1) : state.nextDay))
  const nextReward = state?.rewards.find((r) => r.day === (state.claimedToday ? state.nextDay : state.nextDay + 1))
  const claimedCount = state?.claimedDays.length ?? 0

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)', padding: 8 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col" style={{ width: 'min(1080px, 98vw)', height: 'min(620px, 96vh)', borderRadius: 20,
        background: 'radial-gradient(120% 80% at 50% 0%, rgba(240,180,41,0.12), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        {/* ── Antraštė ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
          <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 'clamp(14px,2.6vh,19px)', textShadow: '0 0 18px rgba(240,180,41,0.5)', letterSpacing: '0.05em' }}>
            {state ? `${LT_MONTHS[state.month - 1].toUpperCase()} PRISIJUNGIMO DOVANOS` : 'PRISIJUNGIMO DOVANOS'}
          </h2>
          <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti" className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
        </div>

        {/* ── 3 zonos ── */}
        <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(160px,0.8fr) minmax(0,2.4fr) minmax(200px,1fr)' }}>

          {/* KAIRĖ: mėnesio progresas */}
          <div className="rounded-2xl flex flex-col gap-3 min-h-0 overflow-y-auto p-3" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(240,180,41,0.22)' }}>
            <div>
              <p className="uppercase font-bold mb-1" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>Mėnesio progresas</p>
              <p className="rvn-disp font-black tabular-nums" style={{ fontSize: 26, color: 'var(--gold)', lineHeight: 1 }}>{claimedCount}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}> / {state?.daysInMonth ?? 30}</span></p>
              <div className="mt-2 rounded-full overflow-hidden" style={{ height: 8, background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: `${state ? Math.round(claimedCount / state.daysInMonth * 100) : 0}%`, background: 'linear-gradient(90deg,#ffe28c,#f3b62c)', boxShadow: '0 0 8px rgba(240,180,41,0.6)' }} />
              </div>
            </div>
            <div className="space-y-1.5" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              <p>{state?.claimedToday ? <>Kitas atlygis po <b className="tabular-nums" style={{ color: '#f3ead3' }}>{fmtDur(nextMidnight - now)}</b></> : <b style={{ color: '#86efac' }}>Atlygis paruoštas!</b>}</p>
              <p>Kalendorius atsinaujina po <b style={{ color: '#f3ead3' }}>{Math.ceil((nextMonth - now) / 86400000)} d.</b></p>
            </div>
            <p className="mt-auto" style={{ fontSize: 9.5, color: 'rgba(150,160,185,0.55)', lineHeight: 1.4 }}>Prisijunk kasdien — 30-tą dieną laukia didžioji skrynia. Praleista diena nepradingsta: atlygiai imami iš eilės.</p>
          </div>

          {/* CENTRAS: kalendorius */}
          <div className="min-h-0 overflow-y-auto">
            <div className="grid grid-cols-6 gap-1.5">
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
                  <div key={r.day} className={isNext ? 'rvn-glow-pulse' : ''} style={{ position: 'relative', borderRadius: 10, padding: '6px 3px', textAlign: 'center', minHeight: 64,
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
          </div>

          {/* DEŠINĖ: šiandienos dovana + CTA */}
          <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(240,180,41,0.22)' }}>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5">
              <div>
                <p className="uppercase font-bold mb-1.5" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>{state?.claimedToday ? 'Šiandien atsiimta' : 'Šiandienos dovana'}</p>
                {todayReward ? (
                  <div className="rounded-xl p-2.5 flex flex-col gap-1.5" style={{ background: 'radial-gradient(120% 100% at 50% 0%, rgba(240,180,41,0.16), transparent 70%), rgba(10,8,16,0.8)', border: '1.5px solid rgba(240,180,41,0.55)' }}>
                    <p className="rvn-disp font-bold" style={{ fontSize: 11, color: 'var(--gold)' }}>{todayReward.day === 30 ? 'DIDŽIOJI SKRYNIA' : `${todayReward.day} DIENA`}</p>
                    {todayReward.payload.map((it, i) => { const c = rewardChip(it); return (
                      <span key={i} className="px-2 py-1 rounded-lg" style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3ead3' }}>{c.icon} <b>{c.label}</b></span>
                    )})}
                  </div>
                ) : <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</p>}
              </div>
              {nextReward && nextReward.day <= (state?.daysInMonth ?? 30) && (
                <div>
                  <p className="uppercase font-bold mb-1.5" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>Rytoj laukia</p>
                  <div className="rounded-xl p-2 flex flex-col gap-1" style={{ background: 'rgba(10,8,16,0.7)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}>
                    <p className="rvn-disp font-bold" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{nextReward.day === 30 ? 'DIDŽIOJI SKRYNIA' : `${nextReward.day} DIENA`}</p>
                    {nextReward.payload.slice(0, 3).map((it, i) => { const c = rewardChip(it); return (
                      <span key={i} style={{ fontSize: 10, color: '#e8dcc0' }}>{c.icon} {c.label}</span>
                    )})}
                  </div>
                </div>
              )}
            </div>
            <button onClick={claim} disabled={!canClaim || busy}
              className="shrink-0 mt-2 w-full rounded-xl font-extrabold"
              style={{ minHeight: 44, fontSize: 13, fontFamily: 'var(--rvn-font-display, Cinzel, serif)',
                cursor: canClaim && !busy ? 'pointer' : 'default',
                background: canClaim ? 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)' : 'rgba(52,211,153,0.14)',
                color: canClaim ? '#3a2406' : '#7dd3b0', border: canClaim ? '1px solid #ffeaa6' : '1px solid rgba(52,211,153,0.4)',
                boxShadow: canClaim ? 'inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 18px rgba(240,180,41,0.35)' : 'none' }}>
              {busy ? 'Skiriama…' : canClaim ? `Atsiimti ${state!.nextDay} d. dovaną` : state?.claimedToday ? '✓ Šiandien atsiimta' : 'Mėnuo užbaigtas'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
