'use client'

// ── Sezono kelias (20 lygių: Nemokamas + Sezono pasas) ───────────────────────
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Lock, Check } from 'lucide-react'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { rewardChip } from '@/lib/gamification/monthlyLogin'
import { getSeasonPath, claimSeasonReward, unlockSeasonPass, type SeasonPath, type SeasonRow, type SeasonSide } from '@/lib/gamification/seasonPath'

function Chips({ payload }: { payload: Record<string, unknown>[] }) {
  if (!payload?.length) return <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>—</span>
  return (
    <span className="flex flex-wrap gap-1 justify-center">
      {payload.map((it, i) => { const c = rewardChip(it); return <span key={i} className="text-[10px]" style={{ color: '#f3ead3' }}>{c.icon}{c.label && <b> {c.label}</b>}</span> })}
    </span>
  )
}

export function SeasonPathModal({ onClose, onReward }: { onClose: () => void; onReward?: () => void }) {
  const [sp, setSp] = useState<SeasonPath | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => { getSeasonPath().then((s) => { if (s) setSp(s) }) }, [])
  useEffect(() => { load() }, [load])

  const claim = useCallback(async (level: number, track: 'free' | 'pass') => {
    if (busy) return; setBusy(true); playUiClick()
    const r = await claimSeasonReward(level, track)
    if (r && 'ok' in r) { playSuccess(); onReward?.() }
    load(); setBusy(false)
  }, [busy, load, onReward])

  const claimAll = useCallback(async () => {
    if (busy || !sp) return; setBusy(true); playUiClick()
    for (const r of sp.rows) {
      if (r.reached && !r.free.claimed && r.free.payload.length) await claimSeasonReward(r.level, 'free')
      if (r.reached && sp.hasPass && !r.pass.claimed && r.pass.payload.length) await claimSeasonReward(r.level, 'pass')
    }
    playSuccess(); onReward?.(); load(); setBusy(false)
  }, [busy, sp, load, onReward])

  const unlock = useCallback(async (cur: 'silver' | 'rubies') => {
    if (busy) return; setBusy(true); playUiClick()
    const r = await unlockSeasonPass(cur)
    if (r && 'ok' in r) { playSuccess(); onReward?.() }
    load(); setBusy(false)
  }, [busy, load, onReward])

  if (typeof document === 'undefined') return null
  const intoLevel = sp ? sp.xp - sp.level * sp.xpPerLevel : 0
  const pct = sp ? Math.min(100, Math.round((intoLevel / sp.xpPerLevel) * 100)) : 0

  const cell = (row: SeasonRow, side: SeasonSide, track: 'free' | 'pass') => {
    const locked = track === 'pass' && !sp?.hasPass
    const claimable = row.reached && !side.claimed && side.payload.length > 0 && !locked
    return (
      <div style={{ flex: 1, borderRadius: 8, padding: '5px 4px', textAlign: 'center', minHeight: 46,
        background: side.claimed ? 'rgba(52,211,153,0.1)' : claimable ? `rgba(240,180,41,0.12)` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${side.claimed ? 'rgba(52,211,153,0.4)' : claimable ? 'rgba(240,180,41,0.6)' : 'rgba(255,255,255,0.08)'}`, opacity: locked ? 0.55 : 1 }}>
        <Chips payload={side.payload} />
        {side.claimed ? <div style={{ fontSize: 9, color: '#34d399', marginTop: 2 }}><Check className="w-3 h-3 inline" /></div>
          : claimable ? <button onClick={() => claim(row.level, track)} disabled={busy} className="mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold" style={{ background: 'linear-gradient(180deg,#ffe28c,#f3b62c)', color: '#3a2406' }}>Atsiimti</button>
          : locked ? <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}><Lock className="w-3 h-3 inline" /></div> : null}
      </div>
    )
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)', padding: 10 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 97vw)', maxHeight: '94vh', display: 'flex', flexDirection: 'column', borderRadius: 20, padding: 16,
        background: 'radial-gradient(120% 60% at 50% 0%, rgba(240,180,41,0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        <div className="flex items-center justify-between mb-1 shrink-0">
          <div>
            <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 17 }}>Sezono kelias</h2>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sp?.season.title ?? ''}</div>
          </div>
          <button onClick={() => { playUiClick(); onClose() }} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
        </div>

        {/* Progresas */}
        <div className="shrink-0 mb-2">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Lygis {sp?.level ?? 0} / {sp?.levels ?? 20}</span>
            <span>{intoLevel} / {sp?.xpPerLevel ?? 1000} XP</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#ffe28c,#f3b62c)' }} />
          </div>
        </div>

        {!sp?.hasPass && (
          <div className="shrink-0 mb-2 flex gap-2">
            <button onClick={() => unlock('silver')} disabled={busy} className="flex-1 py-2 rounded-lg text-[11px] font-extrabold" style={{ background: 'linear-gradient(180deg,#ffe28c,#f3b62c)', color: '#3a2406' }}>Atrakinti pasą · 🥈 {sp?.priceSilver ?? 8000}</button>
            <button onClick={() => unlock('rubies')} disabled={busy} className="flex-1 py-2 rounded-lg text-[11px] font-extrabold" style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.5)' }}>💎 {sp?.priceRubies ?? 950}</button>
          </div>
        )}

        {/* Header eilutė */}
        <div className="flex items-center gap-1.5 shrink-0 px-1 mb-1 text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <span style={{ width: 26 }}></span>
          <span className="flex-1 text-center">Nemokamas</span>
          <span className="flex-1 text-center" style={{ color: sp?.hasPass ? 'var(--gold)' : undefined }}>Sezono pasas</span>
        </div>

        {/* Lygiai */}
        <div className="overflow-y-auto space-y-1.5 pr-1" style={{ flex: 1 }}>
          {(sp?.rows ?? []).map((row) => (
            <div key={row.level} className="flex items-stretch gap-1.5">
              <div className="flex flex-col items-center justify-center shrink-0" style={{ width: 26 }}>
                <span className="rvn-disp" style={{ fontSize: 13, fontWeight: 800, color: row.reached ? 'var(--gold)' : 'var(--text-muted)' }}>{row.level}</span>
              </div>
              {cell(row, row.free, 'free')}
              {cell(row, row.pass, 'pass')}
            </div>
          ))}
        </div>

        <button onClick={claimAll} disabled={busy} className="shrink-0 mt-2 py-2.5 rounded-xl text-sm font-extrabold" style={{ background: 'linear-gradient(135deg, rgba(240,180,41,0.28), rgba(240,180,41,0.1))', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
          {busy ? 'Skiriama…' : 'Atsiimti viską'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
