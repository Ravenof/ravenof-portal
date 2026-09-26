'use client'
// ── Ekranas 3 · Dienos užduotys (sutartys) ──────────────────────────────────
//  Patvirtintas dizainas: screens/12–16, 20.
//  Užduotys, progresas, atlygiai, perrinkimo kaina — iš rvn_get_daily_quests_v2().
import { useCallback, useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import {
  claimDailyChestV2, claimDailyQuest, getDailyQuests, isProgressionError,
  rerollDailyQuest, type DailyQuest, type DailyQuestsState,
} from '@/lib/progression'
import { celebrateRewards, rewardItems } from './RewardCelebration'
import {
  ART, BODY, C, Cta, DISPLAY, ErrorState, isMissingRpc, Kicker, LoadingState, ResetChip,
  RewardChip, RewardIcon, rewardLabel, useCompact, useToast,
} from './kit'
import { ChoiceQueue, RerollConfirmModal } from './ChoiceModals'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { DT } from '@/components/digital/ui/deskTokens'

// Kategorijų akcentai (dizainas: kovos — burgundija, kortų — violetinė, pergalių — auksas)
type Category = 'combat' | 'cards' | 'victory'
function categoryOf(objectiveType: string): Category {
  if (objectiveType.startsWith('win')) return 'victory'
  if (objectiveType.includes('creature') || objectiveType.includes('spell')) return 'cards'
  return 'combat'
}
const CAT: Record<Category, { accent: string; fg: string; wash: string; art: string }> = {
  combat: { accent: 'var(--rvn-burgundy)', fg: 'var(--rvn-burgundy-fg)', wash: 'rgba(110,38,51,.45)', art: ART.fortress },
  cards: { accent: 'var(--rvn-violet)', fg: 'var(--rvn-violet-fg)', wash: 'rgba(118,80,164,.4)', art: ART.cathedral },
  victory: { accent: 'var(--rvn-gold)', fg: 'var(--rvn-gold-hi)', wash: 'rgba(198,161,79,.32)', art: ART.fortress },
}
const DIFF_COLOR: Record<string, string> = { easy: 'var(--rvn-green-fg)', medium: 'var(--rvn-violet-fg)', hard: 'var(--rvn-burgundy-fg)' }

/** Ravenof simbolis perrinkimo mygtukui (lankas + smaigalys + rombas). */
function RerollGlyph({ spinning, size = 19 }: { spinning: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden
      style={{ animation: spinning ? 'rvSpin 1s linear infinite' : undefined }}>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M20 3.6V7.4H16.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9.6 14.4 12 12 14.4 9.6 12z" fill="currentColor" />
    </svg>
  )
}

export function DailyQuestsScreen() {
  const t = useT()
  const { desktop: D } = useDesktopUi()
  const compact = useCompact() && !D
  const toast = useToast()
  const [state, setState] = useState<DailyQuestsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string | null | false>(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [reroll, setReroll] = useState<DailyQuest | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await getDailyQuests()
    setLoading(false)
    if (!r || isProgressionError(r)) { setFailed(r ? String(r.error) : 'no_response'); return }
    setFailed(false); setState(r)
  }, [])
  useEffect(() => { void load() }, [load])

  const claim = async (q: DailyQuest) => {
    if (busy) return
    setBusy(`q${q.id}`); playUiClick()
    const r = await claimDailyQuest(q.id)
    setBusy(null)
    if (!r || isProgressionError(r)) { toast.show(t('progression.quests.claimFailed'), 'err'); return }
    setState(r.snapshot as DailyQuestsState)
    celebrateRewards({ kicker: `${t('rewards.celebrate.kickerQuest')} · ${t(q.titleKey, { target: q.target, count: q.target })}`, title: t('rewards.celebrate.claimed'), titleAccent: t('rewards.celebrate.claimedAccent'), items: rewardItems(r.grantedRewards) })
  }

  const openChest = async () => {
    if (busy) return
    setBusy('chest'); playUiClick()
    const r = await claimDailyChestV2()
    setBusy(null)
    if (!r || isProgressionError(r)) { toast.show(t('progression.quests.chestFailed'), 'err'); return }
    setState(r.snapshot as DailyQuestsState)
    celebrateRewards({ kicker: t('rewards.celebrate.kickerChest'), title: t('rewards.celebrate.chest'), titleAccent: t('rewards.celebrate.chestAccent'), items: rewardItems(r.grantedRewards) })
  }

  const doReroll = async () => {
    if (!reroll || busy) return
    setBusy('reroll'); playUiClick()
    const r = await rerollDailyQuest(reroll.id, true)
    setBusy(null)
    if (!r || isProgressionError(r)) {
      toast.show(r && isProgressionError(r) && r.error === 'not_enough_silver'
        ? t('progression.quests.notEnoughSilver') : t('progression.quests.rerollFailed'), 'err')
      return
    }
    setReroll(null)
    setState(r.snapshot as DailyQuestsState)
    toast.show(t('progression.quests.rerollOk'))
  }

  if (loading && !state) return <LoadingState label={t('progression.quests.loading')} />
  if (failed) return (
    <ErrorState title={t('progression.common.errorTitle')} body={t('progression.common.errorBody')}
      retryLabel={t('progression.common.retry')} onRetry={() => void load()}
      hint={isMissingRpc(failed || '') ? t('progression.common.migrationsMissing') : null}
      detail={typeof failed === 'string' && failed !== 'no_response' ? failed : null} />
  )
  if (!state) return null

  const done = state.quests.filter((q) => q.completed).length
  const rerollsLeft = Math.max(0, state.reroll.max - state.reroll.used)

  // ── sutarties stulpelis ───────────────────────────────────────────────────
  const questCard = (q: DailyQuest) => {
    const cat = CAT[categoryOf(q.objectiveType)]
    const pct = q.target > 0 ? Math.min(100, (q.progress / q.target) * 100) : 0
    const segments = q.target <= 8
    return (
      <div key={q.id} className="rvn-prog-clip" style={{
        flex: 1, minWidth: D ? 0 : compact ? 230 : 210, scrollSnapAlign: 'center', position: 'relative',
        display: 'flex', flexDirection: 'column', border: `1px solid ${q.claimed ? 'rgba(62,139,109,.4)' : C.lineIn}`,
        background: C.raised, overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: cat.accent, zIndex: 2 }} />
        {/* iliustruota galvutė */}
        <div style={{ flex: D ? 'none' : 1, height: D ? 190 : undefined, minHeight: compact ? 92 : 150, position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${C.lineIn}` }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: `url('${cat.art}') center 28%/cover no-repeat`, opacity: 0.5, filter: 'grayscale(.35)' }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(7,6,10,.25), ${cat.wash} 100%)` }} />
          <div style={{ position: 'absolute', left: D ? 16 : 12, top: D ? 14 : 11, display: 'flex', alignItems: 'center', gap: D ? 8 : 7 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ART.questToken} alt="" aria-hidden style={{ width: D ? 22 : 17, height: D ? 22 : 17, objectFit: 'contain' }} />
            <span style={{ font: `${D ? 600 : 500} ${D ? DT.fs.label : 8.5}px ${BODY}`, letterSpacing: 2, color: cat.fg, textTransform: 'uppercase' }}>
              {t(`progression.quests.category.${categoryOf(q.objectiveType)}`)}
            </span>
          </div>
          <div style={{ position: 'absolute', right: D ? 14 : 11, top: D ? 12 : 10, font: `600 ${D ? 12.5 : 9.5}px ${DISPLAY}`, letterSpacing: 0.8, color: DIFF_COLOR[q.difficulty], border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.7)', padding: D ? '5px 10px' : '3px 8px' }}>
            {t(`progression.quests.difficulty.${q.difficulty}`)}
          </div>
          <div style={{ position: 'absolute', left: D ? 16 : 12, right: D ? 16 : 12, bottom: D ? 14 : 10, font: `700 ${D ? 20 : 17}px${D ? '/1.25' : ''} ${DISPLAY}`, color: C.bone, textShadow: '0 2px 10px #000' }}>
            {t(q.titleKey, { target: q.target, count: q.target })}
          </div>
        </div>

        <div style={{ flex: D ? 1 : 'none', display: 'flex', flexDirection: 'column', padding: D ? 16 : compact ? 10 : 12, gap: D ? 14 : 9 }}>
          <div style={{ font: `400 ${D ? 14.5 : 11}px ${BODY}`, color: C.muted, lineHeight: 1.45 }}>{t(q.descKey, { target: q.target, count: q.target })}</div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ font: `700 ${D ? 15 : 11}px ${DISPLAY}`, letterSpacing: 0.6, color: q.completed ? C.greenFg : C.goldHi }}>
                {q.progress} / {q.target}
              </span>
              <span style={{ font: `${D ? 600 : 400} ${D ? DT.fs.label : 9}px ${BODY}`, letterSpacing: 1.4, color: C.label, textTransform: 'uppercase' }}>
                {q.claimed ? t('progression.quests.stClaimed') : q.completed ? t('progression.quests.stDone') : t('progression.quests.stActive')}
              </span>
            </div>
            {segments ? (
              <div style={{ display: 'flex', gap: 3, marginTop: 7 }}>
                {Array.from({ length: q.target }, (_, i) => (
                  <span key={i} style={{
                    flex: 1, height: D ? 9 : 7, border: `1px solid ${i < q.progress ? 'rgba(62,139,109,.6)' : C.lineIn}`,
                    background: i < q.progress ? C.green : '#1a1420',
                  }} />
                ))}
              </div>
            ) : (
              <div style={{ position: 'relative', height: D ? 11 : 9, marginTop: D ? 8 : 7, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: q.completed ? C.green : 'linear-gradient(90deg,#8a6c2c,#E2B958)' }} />
                {[25, 50, 75].map((m) => (
                  <span key={m} aria-hidden style={{ position: 'absolute', top: 1, bottom: 1, left: `${m}%`, width: 1, background: 'rgba(7,6,10,.75)' }} />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {q.rewards.map((r, i) => <RewardChip key={i} reward={r} />)}
          </div>

          {D && <div style={{ flex: 1 }} />}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: D ? 8 : 7 }}>
            <div style={{ flex: 1 }}>
              <Cta onClick={() => void claim(q)} busy={busy === `q${q.id}`} disabled={!q.completed || q.claimed}
                tone={q.claimed ? 'green' : 'gold'}>
                {q.claimed ? t('progression.quests.claimed') : t('progression.quests.claim')}
              </Cta>
            </div>
            {q.rerollable && (
              <button type="button" onClick={() => { playUiClick(); setReroll(q) }}
                aria-label={t('progression.quests.rerollAria')}
                title={q.rerollCostSilver === 0 ? t('progression.quests.rerollFree') : t('progression.quests.rerollCost', { cost: q.rerollCostSilver ?? 0 })}
                style={{ width: D ? DT.cta : 44, minHeight: D ? DT.cta : 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.lineIn}`, background: 'transparent', color: C.gold, cursor: 'pointer' }}>
                <RerollGlyph spinning={busy === 'reroll' && reroll?.id === q.id} size={D ? 22 : 19} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rvn-prog-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* ── Antraštės juosta ── */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: D ? 12 : 10, padding: compact ? '9px 12px' : D ? '14px 20px' : '11px 18px', borderBottom: `1px solid #1e1a26`, flexWrap: D ? 'wrap' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: D ? 8 : 7 }}>
          <span style={{ font: `800 ${D ? 30 : 22}px ${DISPLAY}`, color: C.goldHi, lineHeight: 1 }}>{done}</span>
          <span style={{ font: `600 ${D ? 15 : 12}px ${DISPLAY}`, color: C.label }}>/ {state.quests.length || 3}</span>
          <span style={{ font: `${D ? 600 : 500} ${D ? DT.fs.label : 8.5}px ${BODY}`, letterSpacing: 1.8, color: C.muted, textTransform: 'uppercase', marginLeft: 4 }}>
            {t('progression.quests.completedLabel')}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <ResetChip at={state.resetAt} />
        <div style={{ display: 'flex', alignItems: 'center', gap: D ? 8 : 7, border: `1px solid ${rerollsLeft ? C.lineIn : C.lineDis}`, background: 'rgba(7,6,10,.7)', padding: D ? '0 12px' : '6px 10px', minHeight: D ? DT.ctlSm : undefined }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.questToken} alt="" aria-hidden style={{ width: D ? 18 : 13, height: D ? 18 : 13, objectFit: 'contain' }} />
          <span style={{ font: `400 ${D ? DT.fs.help : 10}px ${BODY}`, color: C.muted }}>
            {t('progression.quests.rerollsLeft')} <span style={{ color: rerollsLeft ? C.goldHi : C.lineDis, fontWeight: 700 }}>{rerollsLeft}</span>
          </span>
        </div>
      </div>

      {/* ── Sutartys + skrynia ── */}
      {state.quests.length === 0 ? (
        <ErrorState title={t('progression.quests.emptyTitle')} body={t('progression.quests.emptyBody')} retryLabel={t('progression.common.retry')} onRetry={() => void load()} />
      ) : (
        <div className="rvn-prog-scroll" style={D ? {
          // Desktop: 3 sutartys + skrynia vienoje eilutėje, natūralaus aukščio (ne ištemptos iki apačios)
          flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'stretch', alignContent: 'start',
          gap: DT.sp.lg, padding: '20px 20px', overflowY: 'auto', overflowX: 'hidden', width: '100%', maxWidth: 1360, margin: '0 auto',
        } : {
          flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: compact ? '10px 12px' : '14px 16px',
          overflowX: 'auto', scrollSnapType: compact ? 'x mandatory' : undefined,
        }}>
          {state.quests.map(questCard)}

          {/* 4-ta destinacija: dienos skrynia */}
          <div className="rvn-prog-clip" style={{
            width: D ? undefined : compact ? 230 : 250, flex: 'none', scrollSnapAlign: 'center', position: 'relative',
            display: 'flex', flexDirection: 'column', border: `1px solid ${state.chest.claimable ? C.goldHi : C.lineIn}`,
            background: C.raised, overflow: 'hidden',
          }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: `url('${ART.cathedral}') center/cover no-repeat`, opacity: 0.12 }} />
            <div style={{ position: 'relative', padding: D ? 18 : compact ? 11 : 14, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Kicker color={C.gold}>{t('progression.quests.chestKicker')}</Kicker>
              <div style={{ font: `700 ${D ? DT.fs.h2 : 16}px ${DISPLAY}`, color: C.bone, marginTop: D ? 4 : 2 }}>{t('progression.quests.chestTitle')}</div>

              <div style={{ position: 'relative', margin: `${compact ? 8 : 12}px 0`, display: 'flex', justifyContent: 'center' }}>
                {state.chest.claimable && (
                  <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(226,185,88,.28), transparent 62%)' }} />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ART.chest} alt="" aria-hidden
                  style={{ position: 'relative', width: D ? 104 : compact ? 62 : 86, height: D ? 104 : compact ? 62 : 86, objectFit: 'contain', opacity: state.chest.claimed ? 0.4 : state.chest.claimable ? 0.95 : 0.55, filter: 'saturate(.72) brightness(.92) drop-shadow(0 6px 18px rgba(0,0,0,.6))' }} />
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {(['easy', 'medium', 'hard'] as const).map((d) => {
                  const q = state.quests.find((x) => x.difficulty === d)
                  const ok = !!q?.completed
                  return (
                    <div key={d} style={{ flex: 1, textAlign: 'center', border: `1px solid ${ok ? 'rgba(62,139,109,.5)' : C.lineIn}`, background: ok ? 'rgba(62,139,109,.14)' : 'transparent', padding: D ? '8px 2px' : '6px 2px' }}>
                      <div style={{ font: `700 ${D ? 15 : 12}px ${DISPLAY}`, color: ok ? C.greenFg : C.lineDis }}>{ok ? '✓' : '—'}</div>
                      <div style={{ font: `${D ? 600 : 500} ${D ? DT.fs.label : 8}px ${BODY}`, letterSpacing: 1, color: C.label, textTransform: 'uppercase' }}>
                        {t(`progression.quests.difficulty.${d}`)}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div aria-hidden style={{ height: 1, background: C.lineIn, margin: `${compact ? 9 : 12}px 0` }} />
              <Kicker>{t('progression.quests.chestHolds')}</Kicker>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {state.chest.rewards.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${r.type === 'season_xp' ? 'rgba(118,80,164,.4)' : 'rgba(198,161,79,.4)'}`, background: r.type === 'season_xp' ? 'rgba(118,80,164,.08)' : 'rgba(198,161,79,.06)', padding: D ? '9px 12px' : '7px 9px' }}>
                    <RewardIcon reward={r} size={D ? 22 : 16} />
                    <span style={{ font: `700 ${D ? 14 : 11}px ${BODY}`, color: r.type === 'season_xp' ? C.violetFg : C.goldHi }}>
                      {rewardLabel(r)} <span style={{ fontWeight: 400, color: C.muted }}>{t(`progression.reward.${r.type}`)}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, minHeight: D ? 16 : 8 }} />
              <p style={{ font: `400 ${D ? DT.fs.help : 10}px ${BODY}`, color: C.muted, lineHeight: 1.5, margin: D ? '0 0 12px' : '0 0 10px' }}>{t('progression.quests.chestNote')}</p>
              <Cta onClick={openChest} busy={busy === 'chest'} disabled={!state.chest.claimable}
                tone={state.chest.claimed ? 'green' : 'gold'}>
                {state.chest.claimed ? t('progression.quests.chestOpened')
                  : state.chest.claimable ? t('progression.quests.chestOpen')
                  : t('progression.quests.chestSealed')}
              </Cta>
            </div>
          </div>
        </div>
      )}

      <RerollConfirmModal
        open={!!reroll}
        costSilver={reroll?.rerollCostSilver ?? 0}
        silverBalance={state.balances.silver}
        progress={reroll?.progress ?? 0}
        target={reroll?.target ?? 0}
        busy={busy === 'reroll'}
        onConfirm={() => void doReroll()}
        onCancel={() => setReroll(null)} />

      <ChoiceQueue choices={state.pendingChoices} onResolved={() => void load()} onClose={() => void load()} />
      {toast.node}
    </div>
  )
}
