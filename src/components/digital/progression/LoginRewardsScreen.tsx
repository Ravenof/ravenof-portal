'use client'
// ── Ekranas 1 · Prisijungimo dovanos (relikvijorius) ────────────────────────
//  Patvirtintas dizainas: screens/01, 02, 03, 05, 18.
//  Visos sumos, būsenos ir laikai — iš rvn_get_login_cycle().
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import {
  claimLoginReward, getLoginRewards, isProgressionError,
  type LoginRewardDay, type LoginRewardState, type RewardDefinition,
} from '@/lib/progression'
import {
  ART, BODY, C, Cta, DISPLAY, Divider, ErrorState, Kicker, LoadingState,
  ProgressBar, ProgressionModal, ResetChip, RewardIcon, RewardRow, rewardLabel,
  useCompact, useToast,
} from './kit'
import { ChoiceQueue } from './ChoiceModals'

const WEEKS = [
  { roman: 'I', key: 'w1', from: 1, to: 7 },
  { roman: 'II', key: 'w2', from: 8, to: 14 },
  { roman: 'III', key: 'w3', from: 15, to: 21 },
  { roman: 'IV', key: 'w4', from: 22, to: 28 },
]

type DayState = 'claimed' | 'today' | 'future' | 'milestone'

function dayState(d: LoginRewardDay, claimable: number | null): DayState {
  if (d.claimed) return 'claimed'
  if (claimable === d.day) return 'today'
  return d.milestone ? 'milestone' : 'future'
}

const TONE: Record<DayState, { border: string; bg: string; label: string }> = {
  claimed: { border: 'rgba(62,139,109,.45)', bg: 'rgba(62,139,109,.16)', label: 'var(--rvn-green-fg)' },
  today: { border: 'var(--rvn-gold-hi)', bg: 'linear-gradient(180deg, rgba(226,185,88,.2), rgba(21,17,28,.9))', label: 'var(--rvn-gold-hi)' },
  milestone: { border: 'rgba(118,80,164,.5)', bg: 'linear-gradient(180deg, rgba(118,80,164,.18), rgba(21,17,28,.9))', label: 'var(--rvn-violet-fg)' },
  future: { border: 'var(--rvn-line-in)', bg: 'var(--rvn-surface)', label: 'var(--rvn-label)' },
}

export function LoginRewardsScreen() {
  const t = useT()
  const compact = useCompact()
  const toast = useToast()
  const [state, setState] = useState<LoginRewardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState<LoginRewardDay | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await getLoginRewards()
    setLoading(false)
    if (!r || isProgressionError(r)) { setFailed(true); return }
    setFailed(false); setState(r)
  }, [])
  useEffect(() => { void load() }, [load])

  const claim = async () => {
    if (busy || !state?.claimableDay) return
    setBusy(true); playUiClick()
    const r = await claimLoginReward()
    setBusy(false)
    if (!r || isProgressionError(r)) { toast.show(t('progression.login.claimFailed'), 'err'); return }
    setState(r.snapshot as LoginRewardState)
    if (r.status === 'completed') toast.show(t('progression.login.claimOk'))
  }

  const pending = state?.pendingChoices ?? []
  const byDay = useMemo(() => new Map((state?.rewards ?? []).map((d) => [d.day, d])), [state?.rewards])
  const focus = state?.claimableDay ? byDay.get(state.claimableDay) : null
  const tomorrow = state?.claimableDay ? byDay.get(state.claimableDay + 1) : null

  if (loading && !state) return <LoadingState label={t('progression.login.loading')} />
  if (failed) return <ErrorState title={t('progression.common.errorTitle')} body={t('progression.common.errorBody')} retryLabel={t('progression.common.retry')} onRetry={() => void load()} />
  if (!state) return null

  const monthPct = (state.cyclePosition / state.cycleLength) * 100
  const statusLine = state.claimedToday ? t('progression.login.statusClaimed')
    : state.cycleCompleted ? t('progression.login.statusCycleDone')
    : t('progression.login.statusReady')
  const statusColor = state.claimedToday ? C.greenFg : state.cycleCompleted ? C.muted : C.goldHi

  // ── dienos mazgas ─────────────────────────────────────────────────────────
  const dayNode = (d: LoginRewardDay, grow: number) => {
    const st = dayState(d, state.claimableDay)
    const tone = TONE[st]
    const first = d.rewards[0]
    return (
      <button key={d.day} type="button" onClick={() => { playUiClick(); setDetail(d) }}
        className={'rvn-prog-clip' + (st === 'today' ? ' rvn-prog-glow' : '')}
        aria-label={`${d.day} ${t('progression.login.dayShort')}`}
        style={{
          flex: grow, minWidth: 0, minHeight: 44, cursor: 'pointer', textAlign: 'left',
          border: `1px solid ${tone.border}`, background: tone.bg, padding: '7px 8px',
          display: 'flex', flexDirection: 'column', gap: 3,
          animation: st === 'today' ? 'rvGlow 2.6s ease-in-out infinite' : undefined,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ font: `700 10px ${DISPLAY}`, color: st === 'future' ? C.muted : C.bone, whiteSpace: 'nowrap' }}>
            {d.day} {t('progression.login.dayShort')}
          </span>
          {d.claimed && <span aria-hidden style={{ font: `400 10px ${BODY}`, color: C.greenFg }}>✓</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {first && <RewardIcon reward={first} size={d.milestone ? 21 : 15} />}
        </div>
        <div style={{ font: `700 11px ${BODY}`, color: st === 'future' ? C.muted : C.bone, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {first ? rewardLabel(first) : '—'}
        </div>
        {d.rewards.length > 1 && (
          <div style={{ font: `400 9px ${BODY}`, color: C.label, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {rewardLabel(d.rewards[1])}
          </div>
        )}
        <div style={{ font: `500 7px ${BODY}`, letterSpacing: 1, color: tone.label, textTransform: 'uppercase' }}>
          {d.claimed ? t('progression.login.stClaimed')
            : st === 'today' ? t('progression.login.stReady')
            : d.milestone ? t('progression.login.stChoice')
            : t('progression.login.stLocked')}
        </div>
      </button>
    )
  }

  const finalDay = byDay.get(31)
  const finalSt = finalDay ? dayState(finalDay, state.claimableDay) : 'future'

  return (
    <div className="rvn-prog-in" style={{ height: '100%', display: 'flex', gap: 14, padding: compact ? '10px 12px' : '14px 16px', minHeight: 0 }}>
      {/* ── Kairė: mėnesio santrauka ── */}
      {!compact && (
        <aside style={{ width: 222, flex: 'none', position: 'relative', border: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.surface}, #0d0b12)`, padding: '18px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: `url('${ART.cathedral}') center/cover no-repeat`, opacity: 0.1, filter: 'grayscale(.5)' }} />
          <div style={{ position: 'relative' }}>
            <Kicker>{t('progression.login.cycleProgress')}</Kicker>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 6 }}>
              <span style={{ font: `800 52px ${DISPLAY}`, lineHeight: 0.9, color: C.goldHi, textShadow: '0 4px 22px rgba(226,185,88,.28)' }}>{state.cyclePosition}</span>
              <span style={{ font: `600 17px ${DISPLAY}`, color: C.label }}>/ {state.cycleLength}</span>
            </div>
            <div style={{ marginTop: 14 }}><ProgressBar pct={monthPct} /></div>
            <div style={{ font: `600 12px ${DISPLAY}`, letterSpacing: 0.6, color: statusColor, marginTop: 14 }}>{statusLine}</div>
            <div style={{ marginTop: 10 }}><ResetChip at={state.nextClaimAt ?? state.resetAt} /></div>
            <Divider margin={16} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Kicker style={{ fontSize: 8, letterSpacing: 1.6 }}>{t('progression.login.streak')}</Kicker>
                <div style={{ font: `700 19px ${DISPLAY}`, color: C.bone }}>
                  {state.streak ?? 0} <span style={{ font: `400 10px ${BODY}`, color: C.label }}>{t('progression.login.daysShort')}</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <Kicker style={{ fontSize: 8, letterSpacing: 1.6 }}>{t('progression.login.missed')}</Kicker>
                <div style={{ font: `700 19px ${DISPLAY}`, color: C.muted }}>{state.missedDays ?? 0}</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <p style={{ position: 'relative', font: `400 10px ${BODY}`, color: C.muted, lineHeight: 1.55, margin: 0 }}>
            {t('progression.login.rules')}
          </p>
        </aside>
      )}

      {/* ── Centras: relikvijoriaus kalendorius ── */}
      <section className="rvn-prog-scroll" style={{ flex: 1, minWidth: 0, position: 'relative', border: `1px solid ${C.line}`, background: C.raised, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: `url('${ART.fortress}') center/cover no-repeat`, opacity: 0.14 }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,6,10,.55), rgba(7,6,10,.9))' }} />
        <div className="rvn-prog-scroll" style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', padding: compact ? 10 : 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {WEEKS.map((w) => (
            <div key={w.key} style={{ display: 'flex', alignItems: 'stretch', gap: 8, flex: 1, minHeight: compact ? 74 : 0 }}>
              <div style={{ width: 44, flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ font: `700 15px ${DISPLAY}`, color: C.gold }}>{w.roman}</div>
                <div style={{ font: `500 7.5px ${BODY}`, letterSpacing: 1.2, color: C.label, textTransform: 'uppercase', lineHeight: 1.3 }}>
                  {t(`progression.login.week.${w.key}`)}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 0 }}>
                {Array.from({ length: 7 }, (_, i) => w.from + i)
                  .map((n) => byDay.get(n))
                  .filter((d): d is LoginRewardDay => !!d)
                  .map((d) => dayNode(d, d.milestone ? 1.65 : 1))}
              </div>
            </div>
          ))}

          {/* Finalo juosta: 29, 30 + 31 relikvijorius */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, flex: 1, minHeight: compact ? 74 : 0 }}>
            <div style={{ width: 44, flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ font: `700 15px ${DISPLAY}`, color: C.gold }}>V</div>
              <div style={{ font: `500 7.5px ${BODY}`, letterSpacing: 1.2, color: C.label, textTransform: 'uppercase' }}>{t('progression.login.week.final')}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 0 }}>
              {[29, 30].map((n) => byDay.get(n)).filter((d): d is LoginRewardDay => !!d).map((d) => dayNode(d, 1))}
              {finalDay && (
                <button type="button" onClick={() => { playUiClick(); setDetail(finalDay) }}
                  className="rvn-prog-clip"
                  style={{
                    flex: 2.4, minWidth: 0, minHeight: 44, cursor: 'pointer', textAlign: 'left',
                    border: `1px solid ${TONE[finalSt].border}`, background: TONE[finalSt].bg,
                    padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ART.chest} alt="" aria-hidden style={{ width: 44, height: 44, objectFit: 'contain', flex: 'none' }} />
                  <div style={{ minWidth: 0 }}>
                    <Kicker color={C.gold}>{t('progression.login.finalKicker')}</Kicker>
                    <div style={{ font: `700 15px ${DISPLAY}`, color: C.bone, marginTop: 1 }}>{t('progression.login.finalTitle')}</div>
                    <div style={{ font: `400 10px ${BODY}`, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {finalDay.rewards.map((r) => rewardLabel(r)).join(' · ')}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Dešinė: šiandienos fokusas ── */}
      <aside style={{ width: compact ? 210 : 274, flex: 'none', border: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.surface}, #0c0a11)`, padding: compact ? 12 : 16, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Kicker color={C.gold}>{t('progression.login.todayKicker')}</Kicker>
        <div style={{ font: `700 21px ${DISPLAY}`, color: C.bone, marginTop: 2 }}>
          {state.claimableDay ? `${state.claimableDay} ${t('progression.login.dayShort')}` : t('progression.login.noRewardToday')}
        </div>

        <div className="rvn-prog-clip" style={{
          marginTop: 12, border: `1px solid ${state.claimableDay ? C.goldHi : C.lineIn}`,
          background: state.claimableDay ? 'linear-gradient(180deg, rgba(226,185,88,.16), rgba(21,17,28,.9))' : C.raised,
          padding: compact ? '14px 12px' : '22px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          {focus?.rewards[0]
            ? <RewardIcon reward={focus.rewards[0]} size={compact ? 52 : 74} />
            : <RewardIcon reward={{ type: 'silver', amount: 0 } as RewardDefinition} size={compact ? 52 : 74} />}
          <div style={{ font: `800 ${compact ? 20 : 26}px ${DISPLAY}`, color: C.goldHi }}>
            {focus?.rewards[0] ? rewardLabel(focus.rewards[0]) : '—'}
          </div>
          {focus && focus.rewards.length > 1 && <RewardRow rewards={focus.rewards.slice(1)} />}
        </div>

        <div style={{ font: `600 11px ${DISPLAY}`, letterSpacing: 0.8, color: statusColor, marginTop: 12 }}>◆ {statusLine}</div>

        {tomorrow && (
          <>
            <Kicker style={{ marginTop: 14 }}>{t('progression.login.tomorrow')}</Kicker>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: 10 }}>
              {tomorrow.rewards[0] && <RewardIcon reward={tomorrow.rewards[0]} size={26} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ font: `700 12px ${DISPLAY}`, color: C.bone }}>{tomorrow.day} {t('progression.login.dayShort')}</div>
                <div style={{ font: `400 10px ${BODY}`, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tomorrow.rewards.map((r) => rewardLabel(r)).join(' · ')}
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ flex: 1, minHeight: 8 }} />
        <Cta onClick={claim} busy={busy} disabled={!state.claimableDay} minHeight={compact ? 44 : 52}>
          {state.claimableDay
            ? t('progression.login.claimCta', { day: state.claimableDay })
            : state.cycleCompleted ? t('progression.login.cycleDoneCta') : t('progression.login.claimedCta')}
        </Cta>
      </aside>

      {/* ── Dienos detalės ── */}
      {detail && (
        <ProgressionModal open onClose={() => setDetail(null)} width={420}
          closeLabel={t('common.close')}
          kicker={`${detail.day} ${t('progression.login.dayShort')}`}
          title={detail.milestone ? t('progression.login.milestoneTitle') : t('progression.login.detailTitle')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {detail.rewards.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: 12 }}>
                <RewardIcon reward={r} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: `700 14px ${DISPLAY}`, color: C.bone }}>{rewardLabel(r)}</div>
                  <div style={{ font: `400 10px ${BODY}`, color: C.muted }}>{t(`progression.reward.${r.type}`)}</div>
                </div>
              </div>
            ))}
            <div style={{ font: `400 10.5px ${BODY}`, color: C.muted, lineHeight: 1.55 }}>
              {detail.claimed ? t('progression.login.detailClaimed') : t('progression.login.detailPending')}
            </div>
          </div>
        </ProgressionModal>
      )}

      {/* ── Pasirinkimų eilė ── */}
      <ChoiceQueue choices={pending} onResolved={() => void load()} onClose={() => void load()} />
      {toast.node}
    </div>
  )
}
