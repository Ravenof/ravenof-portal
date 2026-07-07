'use client'

// ── Dienos užduotys (3: easy/medium/hard) + reroll + dienos skrynia ──────────
// Landscape: 3 užduočių kortelės greta (centras) + dienos skrynia dešinėje
// (pinned CTA) — viskas telpa be scroll.
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, RefreshCw } from 'lucide-react'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { rewardChip } from '@/lib/gamification/monthlyLogin'
import { getDailyTasks, claimDailyTask, claimDailyChest, rerollDailyTask, DIFF_LABEL, DIFF_ACCENT, type DailyTasksState, type DailyTask } from '@/lib/gamification/dailyTasks'

function Chips({ payload }: { payload: Record<string, unknown>[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {payload.map((it, i) => { const c = rewardChip(it); return (
        <span key={i} className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(240,180,41,0.3)', color: '#f3ead3' }}>{c.icon} {c.label}</span>
      )})}
    </span>
  )
}

export function DailyTasksModal({ onClose, onReward }: { onClose: () => void; onReward?: () => void }) {
  const [state, setState] = useState<DailyTasksState | null>(null)
  const [busy, setBusy] = useState<number | 'chest' | null>(null)

  const load = useCallback(() => { getDailyTasks().then((s) => { if (s) setState(s) }) }, [])
  useEffect(() => { load() }, [load])

  const doClaim = useCallback(async (t: DailyTask) => {
    if (busy) return; setBusy(t.id); playUiClick()
    const r = await claimDailyTask(t.id)
    if (r && 'ok' in r) { playSuccess(); onReward?.() }
    load(); setBusy(null)
  }, [busy, load, onReward])

  const doReroll = useCallback(async (t: DailyTask) => {
    if (busy) return; setBusy(t.id); playUiClick()
    await rerollDailyTask(t.id); load(); onReward?.(); setBusy(null)
  }, [busy, load, onReward])

  const doChest = useCallback(async () => {
    if (busy) return; setBusy('chest'); playUiClick()
    const r = await claimDailyChest()
    if (r && 'ok' in r) { playSuccess(); onReward?.() }
    load(); setBusy(null)
  }, [busy, load, onReward])

  if (typeof document === 'undefined') return null
  const rerollsLeft = state ? 3 - ((state.reroll.freeUsed ? 1 : 0) + state.reroll.paidCount) : 0

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)', padding: 8 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col" style={{ width: 'min(1060px, 98vw)', height: 'min(560px, 96vh)', borderRadius: 20,
        background: 'radial-gradient(120% 80% at 50% 0%, rgba(240,180,41,0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        {/* ── Antraštė ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
          <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 'clamp(14px,2.6vh,18px)', letterSpacing: '0.06em' }}>DIENOS UŽDUOTYS</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-muted)' }}>Perrinkimų liko: {rerollsLeft}</span>
            <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti" className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── Centras (3 kortelės) + dešinė (skrynia) ── */}
        <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(0,2.8fr) minmax(210px,1fr)' }}>

          {/* 3 užduotys greta */}
          <div className="min-h-0 overflow-y-auto grid gap-2 content-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {(state?.tasks ?? []).map((t) => {
              const acc = DIFF_ACCENT[t.difficulty]
              const pct = Math.min(100, Math.round((t.progress / Math.max(1, t.target)) * 100))
              return (
                <div key={t.id} className="flex flex-col" style={{ borderRadius: 14, padding: 12, background: `linear-gradient(150deg, rgba(${acc},0.08), rgba(10,8,16,0.92))`, border: `1px solid rgba(${acc},0.4)` }}>
                  <div className="flex items-center justify-between mb-1 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide" style={{ background: `rgba(${acc},0.18)`, color: `rgb(${acc})`, border: `1px solid rgba(${acc},0.5)` }}>{DIFF_LABEL[t.difficulty].toUpperCase()}</span>
                    {!t.completed && rerollsLeft > 0 && (
                      <button onClick={() => doReroll(t)} disabled={busy !== null} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }} title={state?.reroll.freeUsed ? 'Perrinkti (50 Sidabro)' : 'Nemokamas perrinkimas'}>
                        <RefreshCw className="w-3 h-3" /> {state?.reroll.freeUsed ? '50🪙' : 'Perrinkti'}
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-bold shrink-0" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{t.title}</div>
                  <div className="text-[11px] mb-2 shrink-0" style={{ color: 'var(--text-muted)' }}>{t.description}</div>
                  <div className="h-2 rounded-full overflow-hidden mb-2 shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, rgba(${acc},0.7), rgb(${acc}))`, transition: 'width .5s' }} />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <Chips payload={t.rewardPayload} />
                    <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>{t.progress}/{t.target}</span>
                  </div>
                  <div className="mt-auto pt-2">
                    {t.completed && (
                      <button onClick={() => doClaim(t)} disabled={t.claimed || busy !== null}
                        className="w-full py-2 rounded-lg text-xs font-extrabold" style={{
                          background: t.claimed ? 'rgba(52,211,153,0.14)' : 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)',
                          color: t.claimed ? '#7dd3b0' : '#3a2406', border: t.claimed ? '1px solid rgba(52,211,153,0.4)' : '1px solid #ffeaa6' }}>
                        {t.claimed ? '✓ Atsiimta' : 'Atsiimti'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {!state && <p className="col-span-full text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
          </div>

          {/* Dienos skrynia */}
          <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={{ background: state?.allDone ? 'radial-gradient(120% 100% at 50% 0%, rgba(240,180,41,0.24), transparent), linear-gradient(160deg, rgba(46,34,64,0.95), rgba(12,9,18,0.97))' : 'linear-gradient(160deg, rgba(20,15,30,0.9), rgba(10,8,16,0.95))', border: `1px solid rgba(240,180,41,${state?.allDone ? '0.6' : '0.25'})` }}>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-2 text-center">
              <span style={{ fontSize: 44, filter: state?.allDone ? 'drop-shadow(0 0 14px rgba(240,180,41,0.6))' : 'saturate(0.6)' }}>🧰</span>
              <div className="text-sm font-extrabold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Dienos skrynia</div>
              <div className="text-[10px]" style={{ color: state?.allDone ? '#86efac' : 'var(--text-muted)' }}>{state?.allDone ? '✓ Visos 3 užduotys atliktos!' : `Atlik visas 3 užduotis (${(state?.tasks ?? []).filter((t) => t.completed).length}/3)`}</div>
              <div className="flex flex-col gap-1 w-full mt-1">
                <Chips payload={[{ type: 'season_xp', amount: 250 }, { type: 'currency', currency: 'silver', amount: 200 }, { type: 'currency', currency: 'essence', amount: 100 }, { type: 'currency', currency: 'rubies', amount: 15 }, { type: 'item', item_type: 'pack', item_id: 'standard_pack', quantity: 1 }]} />
              </div>
              <p className="mt-auto" style={{ fontSize: 9.5, color: 'rgba(150,160,185,0.55)', lineHeight: 1.4 }}>Skrynios atlygis kelia ir sezono kelio XP. Naujos užduotys — 00:00.</p>
            </div>
            <button onClick={doChest} disabled={!state?.allDone || state?.chestClaimed || busy !== null}
              className="shrink-0 mt-2 w-full py-2.5 rounded-xl text-sm font-extrabold" style={{
                background: state?.allDone && !state?.chestClaimed ? 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)' : 'rgba(52,211,153,0.12)',
                color: state?.allDone && !state?.chestClaimed ? '#3a2406' : '#7dd3b0', border: state?.allDone && !state?.chestClaimed ? '1px solid #ffeaa6' : '1px solid rgba(52,211,153,0.4)',
                cursor: state?.allDone && !state?.chestClaimed ? 'pointer' : 'default' }}>
              {state?.chestClaimed ? '✓ Skrynia atsiimta' : busy === 'chest' ? 'Skiriama…' : 'Atsiimti skrynią'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
