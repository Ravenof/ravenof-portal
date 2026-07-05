'use client'

// ── Dienos užduotys (3: easy/medium/hard) + reroll + dienos skrynia ──────────
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)', padding: 12 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 96vw)', maxHeight: '92vh', overflowY: 'auto', borderRadius: 20, padding: 18,
        background: 'radial-gradient(120% 80% at 50% 0%, rgba(240,180,41,0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 18 }}>Dienos užduotys</h2>
          <button onClick={() => { playUiClick(); onClose() }} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-2.5">
          {(state?.tasks ?? []).map((t) => {
            const acc = DIFF_ACCENT[t.difficulty]
            const pct = Math.min(100, Math.round((t.progress / Math.max(1, t.target)) * 100))
            return (
              <div key={t.id} style={{ borderRadius: 14, padding: 12, background: `linear-gradient(150deg, rgba(${acc},0.08), rgba(10,8,16,0.92))`, border: `1px solid rgba(${acc},0.4)` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide" style={{ background: `rgba(${acc},0.18)`, color: `rgb(${acc})`, border: `1px solid rgba(${acc},0.5)` }}>{DIFF_LABEL[t.difficulty].toUpperCase()}</span>
                  {!t.completed && rerollsLeft > 0 && (
                    <button onClick={() => doReroll(t)} disabled={busy !== null} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }} title={state?.reroll.freeUsed ? 'Perrinkti (50 Sidabro)' : 'Nemokamas perrinkimas'}>
                      <RefreshCw className="w-3 h-3" /> {state?.reroll.freeUsed ? '50🪙' : 'Perrinkti'}
                    </button>
                  )}
                </div>
                <div className="text-sm font-bold" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{t.title}</div>
                <div className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>{t.description}</div>
                <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, rgba(${acc},0.7), rgb(${acc}))`, transition: 'width .5s' }} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Chips payload={t.rewardPayload} />
                  <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>{t.progress}/{t.target}</span>
                </div>
                {t.completed && (
                  <button onClick={() => doClaim(t)} disabled={t.claimed || busy !== null}
                    className="w-full mt-2 py-2 rounded-lg text-xs font-extrabold" style={{
                      background: t.claimed ? 'rgba(52,211,153,0.14)' : 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)',
                      color: t.claimed ? '#7dd3b0' : '#3a2406', border: t.claimed ? '1px solid rgba(52,211,153,0.4)' : '1px solid #ffeaa6' }}>
                    {t.claimed ? '✓ Atsiimta' : 'Atsiimti'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Dienos skrynia */}
        <div className="mt-3.5 rounded-xl p-3" style={{ background: state?.allDone ? 'radial-gradient(120% 100% at 50% 0%, rgba(240,180,41,0.24), transparent), linear-gradient(160deg, rgba(46,34,64,0.95), rgba(12,9,18,0.97))' : 'linear-gradient(160deg, rgba(20,15,30,0.9), rgba(10,8,16,0.95))', border: `1px solid rgba(240,180,41,${state?.allDone ? '0.6' : '0.25'})` }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span style={{ fontSize: 22 }}>🧰</span>
            <div className="flex-1">
              <div className="text-sm font-extrabold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Dienos skrynia</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{state?.allDone ? 'Visos 3 užduotys atliktos!' : 'Atlik visas 3 užduotis'}</div>
            </div>
          </div>
          <div className="mb-2"><Chips payload={[{ type: 'season_xp', amount: 250 }, { type: 'currency', currency: 'silver', amount: 200 }, { type: 'currency', currency: 'essence', amount: 100 }, { type: 'currency', currency: 'rubies', amount: 15 }, { type: 'item', item_type: 'pack', item_id: 'standard_pack', quantity: 1 }]} /></div>
          <button onClick={doChest} disabled={!state?.allDone || state?.chestClaimed || busy !== null}
            className="w-full py-2.5 rounded-lg text-sm font-extrabold" style={{
              background: state?.allDone && !state?.chestClaimed ? 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)' : 'rgba(52,211,153,0.12)',
              color: state?.allDone && !state?.chestClaimed ? '#3a2406' : '#7dd3b0', border: state?.allDone && !state?.chestClaimed ? '1px solid #ffeaa6' : '1px solid rgba(52,211,153,0.4)',
              cursor: state?.allDone && !state?.chestClaimed ? 'pointer' : 'default' }}>
            {state?.chestClaimed ? '✓ Skrynia atsiimta' : busy === 'chest' ? 'Skiriama…' : 'Atsiimti skrynią'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
