'use client'

// ── Sezono kelias (20 lygių: Nemokamas + Sezono pasas) — landscape kelias ────
// Viršus: sezonas + laikas + XP progresas. Centras: HORIZONTALUS takas
// (kiekvienas lygis = stulpelis: Free viršuje, Pass apačioje). Dešinė:
// pasirinkto lygio preview + Atsiimti + Atrakinti pasą + Atsiimti viską (pinned).
import { useCallback, useEffect, useRef, useState } from 'react'
import { RewardChip } from '@/components/digital/ui/RewardBits'
import { createPortal } from 'react-dom'
import { X, Lock, Check } from 'lucide-react'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { getSeasonPath, claimSeasonReward, unlockSeasonPass, type SeasonPath, type SeasonRow, type SeasonSide } from '@/lib/gamification/seasonPath'
import { useEscClose } from '@/lib/useEscClose'

function Chips({ payload, size = 10 }: { payload: Record<string, unknown>[]; size?: number }) {
  if (!payload?.length) return <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>—</span>
  return (
    <span className="flex flex-wrap gap-1 justify-center">
      {payload.map((it, i) => <span key={i} style={{ lineHeight: 1.2 }}><RewardChip it={it} size={Math.round(size * 1.35)} textSize={size} color="#f3ead3" /></span>)}
    </span>
  )
}

export function SeasonPathModal({ onClose, onReward }: { onClose: () => void; onReward?: () => void }) {
  useEscClose(onClose)
  const [sp, setSp] = useState<SeasonPath | null>(null)
  const [busy, setBusy] = useState(false)
  const [selLevel, setSelLevel] = useState<number | null>(null)
  const activeRef = useRef<HTMLDivElement | null>(null)
  const scrolled = useRef(false)

  const load = useCallback(() => { getSeasonPath().then((s) => { if (s) setSp(s) }) }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!sp || scrolled.current || !activeRef.current) return
    scrolled.current = true
    try { activeRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) } catch {}
  }, [sp])

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
  const daysLeft = sp?.season.endsAt ? Math.max(0, Math.ceil((new Date(sp.season.endsAt).getTime() - Date.now()) / 86400000)) : null
  const activeLevel = sp ? (sp.rows.find((r) => r.reached && ((!r.free.claimed && r.free.payload.length > 0) || (sp.hasPass && !r.pass.claimed && r.pass.payload.length > 0)))?.level ?? Math.min(sp.level + 1, sp.levels)) : null
  const selected = sp?.rows.find((r) => r.level === (selLevel ?? activeLevel)) ?? null
  const anyClaimable = !!sp && sp.rows.some((r) => r.reached && ((!r.free.claimed && r.free.payload.length > 0) || (sp.hasPass && !r.pass.claimed && r.pass.payload.length > 0)))

  const cell = (row: SeasonRow, side: SeasonSide, track: 'free' | 'pass') => {
    const locked = track === 'pass' && !sp?.hasPass
    const claimable = row.reached && !side.claimed && side.payload.length > 0 && !locked
    return (
      <div className="w-full flex flex-col items-center justify-center gap-0.5" style={{ borderRadius: 8, padding: '4px 3px', minHeight: 52,
        background: side.claimed ? 'rgba(52,211,153,0.1)' : claimable ? 'rgba(240,180,41,0.14)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${side.claimed ? 'rgba(52,211,153,0.4)' : claimable ? 'rgba(240,180,41,0.65)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: claimable ? '0 0 10px rgba(240,180,41,0.25)' : 'none', opacity: locked ? 0.5 : row.reached || claimable ? 1 : 0.65 }}>
        <Chips payload={side.payload} size={9} />
        {side.claimed ? <Check className="w-3 h-3" style={{ color: '#34d399' }} />
          : locked ? <Lock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} /> : null}
      </div>
    )
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)', padding: 8 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col" style={{ width: 'min(1120px, 98vw)', height: 'min(620px, 96vh)', borderRadius: 20,
        background: 'radial-gradient(120% 60% at 50% 0%, rgba(240,180,41,0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        {/* ── Viršus ── */}
        <div className="px-4 pt-3 pb-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate" style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 'clamp(14px,2.6vh,18px)', letterSpacing: '0.06em' }}>
              SEZONO KELIAS <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0 }}>· {sp?.season.title ?? ''}</span>
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              {daysLeft !== null && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-muted)' }}>⏳ liko {daysLeft} d.</span>}
              <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti" className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] shrink-0" style={{ color: 'var(--text-secondary)' }}>Lygis <b style={{ color: 'var(--gold)' }}>{sp?.level ?? 0}</b> / {sp?.levels ?? 20}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#ffe28c,#f3b62c)', boxShadow: '0 0 8px rgba(240,180,41,0.5)' }} />
            </div>
            <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-secondary)' }}>{intoLevel} / {sp?.xpPerLevel ?? 1000} XP</span>
          </div>
        </div>

        {/* ── Takas + dešinė ── */}
        <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(0,2.9fr) minmax(210px,1fr)' }}>

          {/* HORIZONTALUS takas */}
          <div className="min-h-0 flex flex-col">
            <div className="shrink-0 grid mb-1" style={{ gridTemplateColumns: '52px 1fr' }}>
              <span />
              <span className="flex justify-between px-1 text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                <span>Slink taką →</span>
                <span style={{ color: sp?.hasPass ? 'var(--gold)' : undefined }}>{sp?.hasPass ? '✓ Sezono pasas aktyvus' : 'Sezono pasas neaktyvus'}</span>
              </span>
            </div>
            <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: '52px 1fr' }}>
              {/* eilučių etiketės */}
              <div className="flex flex-col justify-center gap-1.5 pr-1.5" style={{ paddingTop: 22 }}>
                <span className="flex-1 flex items-center justify-end text-[9px] font-bold uppercase text-right" style={{ color: 'var(--text-secondary)' }}>Nemok.</span>
                <span className="flex-1 flex items-center justify-end text-[9px] font-bold uppercase text-right" style={{ color: sp?.hasPass ? 'var(--gold)' : 'var(--text-muted)' }}>Pasas</span>
              </div>
              {/* stulpeliai */}
              <div className="min-h-0 overflow-x-auto overflow-y-hidden">
                <div className="h-full flex items-stretch gap-1.5 px-1" style={{ minWidth: 'max-content' }}>
                  {(sp?.rows ?? []).map((row) => {
                    const isSel = selected?.level === row.level
                    return (
                      <div key={row.level} ref={row.level === activeLevel ? activeRef : undefined}
                        onClick={() => { playUiClick(); setSelLevel(row.level) }}
                        className="h-full flex flex-col gap-1.5 cursor-pointer rounded-xl p-1"
                        style={{ width: 104, border: isSel ? '1.5px solid rgba(240,180,41,0.9)' : '1px solid transparent', background: isSel ? 'rgba(240,180,41,0.06)' : 'transparent', boxShadow: isSel ? '0 0 12px rgba(240,180,41,0.3)' : 'none' }}>
                        <span className="shrink-0 text-center rvn-disp" style={{ fontSize: 12, fontWeight: 800, height: 18, color: row.reached ? 'var(--gold)' : 'var(--text-muted)' }}>{row.level}</span>
                        <div className="flex-1 flex">{cell(row, row.free, 'free')}</div>
                        <div className="flex-1 flex">{cell(row, row.pass, 'pass')}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* DEŠINĖ: pasirinktas lygis + pasas + atsiimti */}
          <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(240,180,41,0.22)' }}>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5">
              {selected ? (
                <>
                  <p className="rvn-disp font-bold" style={{ fontSize: 13, color: 'var(--gold)' }}>LYGIS {selected.level} {selected.reached ? '' : '· 🔒'}</p>
                  <div>
                    <p className="uppercase font-bold mb-1" style={{ fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.14em' }}>Nemokamas takas</p>
                    <div className="rounded-lg px-2 py-1.5 flex items-center justify-between gap-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <Chips payload={selected.free.payload} size={11} />
                      {selected.free.claimed ? <Check className="w-4 h-4 shrink-0" style={{ color: '#34d399' }} />
                        : selected.reached && selected.free.payload.length > 0 ? (
                          <button onClick={() => claim(selected.level, 'free')} disabled={busy} className="rvn-press shrink-0 px-2 py-1 rounded text-[10px] font-extrabold" style={{ background: 'linear-gradient(180deg,#ffe28c,#f3b62c)', color: '#3a2406' }}>Atsiimti</button>
                        ) : null}
                    </div>
                  </div>
                  <div>
                    <p className="uppercase font-bold mb-1" style={{ fontSize: 9, color: sp?.hasPass ? 'var(--gold)' : 'var(--text-muted)', letterSpacing: '0.14em' }}>Sezono pasas {sp?.hasPass ? '' : '(neaktyvus)'}</p>
                    <div className="rounded-lg px-2 py-1.5 flex items-center justify-between gap-2" style={{ background: sp?.hasPass ? 'rgba(240,180,41,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sp?.hasPass ? 'rgba(240,180,41,0.35)' : 'rgba(255,255,255,0.08)'}`, opacity: sp?.hasPass ? 1 : 0.6 }}>
                      <Chips payload={selected.pass.payload} size={11} />
                      {selected.pass.claimed ? <Check className="w-4 h-4 shrink-0" style={{ color: '#34d399' }} />
                        : sp?.hasPass && selected.reached && selected.pass.payload.length > 0 ? (
                          <button onClick={() => claim(selected.level, 'pass')} disabled={busy} className="rvn-press shrink-0 px-2 py-1 rounded text-[10px] font-extrabold" style={{ background: 'linear-gradient(180deg,#ffe28c,#f3b62c)', color: '#3a2406' }}>Atsiimti</button>
                        ) : !sp?.hasPass ? <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} /> : null}
                    </div>
                  </div>
                  {!selected.reached && <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pasieksi šį lygį surinkęs {selected.xpRequired.toLocaleString()} XP.</p>}
                </>
              ) : <p className="text-center py-6" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sp ? 'Pasirink lygį take.' : 'Kraunama…'}</p>}
              <p style={{ fontSize: 9.5, color: 'rgba(150,160,185,0.55)', lineHeight: 1.4 }}>Sezono pasas atrakina apatinę atlygių eilę — pasieki abu atlygius kartu su nemokamais. Sezonas atsinaujina kas ketvirtį.</p>
            </div>
            <div className="shrink-0 mt-2 flex flex-col gap-1.5">
              {!sp?.hasPass && (
                <div className="flex gap-1.5">
                  <button onClick={() => unlock('silver')} disabled={busy} className="rvn-press flex-1 py-2 rounded-lg text-[10.5px] font-extrabold" style={{ background: 'linear-gradient(180deg,#ffe28c,#f3b62c)', color: '#3a2406' }}>Atrakinti · <RewardChip it={{ type: 'currency', currency: 'silver', amount: sp?.priceSilver ?? 8000 }} size={14} textSize={10.5} color="#3a2406" /></button>
                  <button onClick={() => unlock('rubies')} disabled={busy} className="rvn-press flex-1 py-2 rounded-lg text-[10.5px] font-extrabold" style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.5)' }}><RewardChip it={{ type: 'currency', currency: 'rubies', amount: sp?.priceRubies ?? 950 }} size={14} textSize={10.5} color="#fca5a5" /></button>
                </div>
              )}
              <button onClick={claimAll} disabled={busy || !anyClaimable} className="rvn-press w-full rounded-xl font-extrabold disabled:opacity-40"
                style={{ minHeight: 40, fontSize: 12, background: anyClaimable ? 'linear-gradient(135deg, rgba(240,180,41,0.28), rgba(240,180,41,0.1))' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                {busy ? 'Skiriama…' : 'Atsiimti viską'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
